const SZFASHION_STOCK_SHEET = "STOCK";
const SZFASHION_HISTORY_SHEET = "STOCK_HISTORY";

function getInventoryPayload_() {
  const sheet = getRequiredSheet_(SZFASHION_STOCK_SHEET);
  const items = readInventoryItems_(sheet);
  const generatedAt = new Date().toISOString();
  return {
    items: items,
    summary: buildInventorySummary_(items, items.length, false, generatedAt),
    generatedAt: generatedAt,
    source: "google_sheets"
  };
}

function getHistoryPayload_(options) {
  const settings = options || {};
  const sheet = getOptionalSheet_(SZFASHION_HISTORY_SHEET);
  const items = sheet ? readHistoryItems_(sheet) : [];
  const generatedAt = new Date().toISOString();
  return {
    items: items,
    nextOffset: Number(items.length || 0),
    hasMore: false,
    totalMatched: Number(items.length || 0),
    generatedAt: generatedAt,
    source: "google_sheets"
  };
}

function getDetailPayload_(reference) {
  const normalizedReference = normalizeReference_(reference);
  const historyPayload = getHistoryPayload_({ loadAll: true });
  const item = normalizedReference ? findInventoryItemByReference_(normalizedReference) : null;
  const history = normalizedReference ? historyPayload.items.filter(function(entry) {
    return normalizeReference_(entry.reference) === normalizedReference;
  }) : [];
  return {
    item: item,
    history: history,
    nextHistoryOffset: Number(history.length || 0),
    hasMoreHistory: false,
    generatedAt: new Date().toISOString(),
    lastMovementAt: history.length ? String(history[0].timestampRaw || "") : "",
    notFoundInStock: !item,
    source: "google_sheets"
  };
}

function findInventoryItemByReference_(reference) {
  const sheet = getOptionalSheet_(SZFASHION_STOCK_SHEET);
  if (!sheet) return null;
  const items = readInventoryItems_(sheet);
  for (let i = 0; i < items.length; i++) {
    if (normalizeReference_(items[i].reference) === reference) return items[i];
  }
  return null;
}

function readInventoryItems_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw new Error("La feuille STOCK ne contient aucun en-tête.");
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const cols = resolveInventoryColumns_(headers);
  if (!cols.reference) {
    throw new Error("Colonne référence introuvable dans STOCK.");
  }
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  const items = [];
  for (let i = 0; i < values.length; i++) {
    const item = buildInventoryItem_(values[i], cols, i + 2);
    if (item) items.push(item);
  }
  items.sort(function(a, b) {
    return String(a.sortKey || a.reference || "").localeCompare(String(b.sortKey || b.reference || ""));
  });
  return items;
}

function buildInventoryItem_(row, cols, rowIndex) {
  const reference = normalizeReference_(getRowCell_(row, cols.reference));
  if (!reference) return null;

  const tail = parseLooseInteger_(getRowCell_(row, cols.tailRaw));
  const unitsPerBox = parseLooseInteger_(getRowCell_(row, cols.unitsPerBoxRaw));
  const itemBoxes = parseLooseInteger_(getRowCell_(row, cols.boxesRaw));
  const fractionRaw = String(getRowCell_(row, cols.fractionRaw) || "").trim();
  const fractionText = normalizeFractionText_(fractionRaw);
  const fractionValue = parseFractionValue_(fractionRaw);
  const sign = normalizeSign_(getRowCell_(row, cols.signRaw));
  const colisage = parsePositiveNumber_(getRowCell_(row, cols.colisage));
  const packNotation = normalizePackNotation_(getRowCell_(row, cols.packNotation));
  const remark = String(getRowCell_(row, cols.remark) || "").trim();
  const warehouse = String(getRowCell_(row, cols.warehouse) || "").trim();
  const createdAt = String(getRowCell_(row, cols.createdAt) || "").trim();
  const arrivalNote = String(getRowCell_(row, cols.arrivalNote) || "").trim();

  const stateModel = {
    tail: tail,
    unitsPerBox: unitsPerBox,
    itemBoxes: itemBoxes,
    sign: sign,
    fractionText: fractionText,
    fractionValue: fractionValue,
    colisage: colisage,
    packNotation: packNotation,
    remark: remark
  };

  return {
    id: "row_" + String(rowIndex || 0),
    reference: reference,
    sortKey: normalizeReference_(getRowCell_(row, cols.sortKey)) || reference,
    stockDisplay: buildStockDisplay_(stateModel),
    stockState: computeStockState_(stateModel),
    tail: tail,
    unitsPerBox: unitsPerBox,
    itemBoxes: itemBoxes,
    sign: sign,
    fractionText: fractionText,
    fractionValue: fractionValue,
    colisage: colisage,
    packNotation: packNotation,
    remark: remark,
    packsPerBox: colisage > 0 ? colisage : 0,
    packCounterText: packNotation || "",
    dynamicFractions: [],
    warehouse: warehouse,
    createdAt: createdAt,
    arrivalNote: arrivalNote
  };
}

function buildInventorySummary_(items, totalRows, isPartial, generatedAt) {
  const list = Array.isArray(items) ? items : [];
  let positiveCount = 0;
  let totalBoxes = 0;
  let totalPieces = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item.stockState === "positive") positiveCount += 1;
    totalBoxes += Math.max(0, parseLooseInteger_(item.itemBoxes));
    totalPieces += Math.max(0, stateModelToPieces_(item));
  }

  return {
    visibleCount: list.length,
    positiveCount: positiveCount,
    zeroCount: Math.max(0, list.length - positiveCount),
    totalRows: Number(totalRows || list.length),
    totalBoxes: totalBoxes,
    totalPieces: totalPieces,
    isPartial: !!isPartial,
    generatedAt: generatedAt
  };
}

function readHistoryItems_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const cols = resolveHistoryColumns_(headers);
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const displayValues = range.getDisplayValues();
  const rawValues = range.getValues();
  const items = [];

  for (let i = rawValues.length - 1; i >= 0; i--) {
    const entry = buildHistoryEntry_(displayValues[i], rawValues[i], cols);
    if (entry) items.push(entry);
  }

  return items;
}

function buildHistoryEntry_(displayRow, rawRow, cols) {
  if (!displayRow || !rawRow) return null;
  const reference = normalizeReference_(getRowCell_(displayRow, cols.reference));
  const actionType = normalizeHistoryActionType_(getRowCell_(displayRow, cols.actionType));
  const timestampRaw = historyTimestampRaw_(getRowCell_(rawRow, cols.timestamp));
  if (!reference && !actionType && !timestampRaw) return null;
  console.log(
    "readHistory reference raw=%s display=%s normalized=%s",
    String(getRowCell_(rawRow, cols.reference) || ""),
    String(getRowCell_(displayRow, cols.reference) || ""),
    reference
  );

  return {
    timestampRaw: timestampRaw,
    timestampLabel: formatHistoryTimestamp_(getRowCell_(rawRow, cols.timestamp)),
    actionType: actionType,
    reference: reference,
    rowId: String(getRowCell_(displayRow, cols.rowId) || "").trim(),
    beforeDisplay: String(getRowCell_(displayRow, cols.beforeDisplay) || "").trim(),
    afterDisplay: String(getRowCell_(displayRow, cols.afterDisplay) || "").trim(),
    remark: String(getRowCell_(displayRow, cols.remark) || "").trim(),
    source: String(getRowCell_(displayRow, cols.source) || "").trim(),
    beforeTotalPieces: Number(getRowCell_(rawRow, cols.beforeTotalPieces) || 0),
    afterTotalPieces: Number(getRowCell_(rawRow, cols.afterTotalPieces) || 0)
  };
}

function resolveInventoryColumns_(headers) {
  return {
    reference: findColumn_(headers, ["货号", "Reference", "Référence", "ref"]),
    sortKey: findColumn_(headers, ["SortKey"]),
    tailRaw: findColumn_(headers, ["尾箱"]),
    unitsPerBoxRaw: findColumn_(headers, ["件/箱", "每箱件数2"]),
    boxesRaw: findColumn_(headers, ["箱数"]),
    signRaw: findColumn_(headers, ["当前signe"]),
    fractionRaw: findColumn_(headers, ["当前箱数分数"]),
    colisage: findColumn_(headers, ["Colisage"]),
    packNotation: findColumn_(headers, ["Notation paquets"]),
    remark: findColumn_(headers, ["放位/提醒"]),
    warehouse: findColumn_(headers, ["仓库", "entrepot", "entrepôt"]),
    createdAt: findColumn_(headers, ["date de création", "修改日期", "进货"]),
    arrivalNote: findColumn_(headers, ["到货单", "arrivalNote", "arrival", "ASN", "asn", "deliveryNote", "bon de livraison"])
  };
}

function resolveHistoryColumns_(headers) {
  return {
    timestamp: findColumn_(headers, ["timestamp"]),
    actionType: findColumn_(headers, ["action_type"]),
    reference: findColumn_(headers, ["reference"]),
    rowId: findColumn_(headers, ["row_id"]),
    beforeDisplay: findColumn_(headers, ["before_display"]),
    afterDisplay: findColumn_(headers, ["after_display"]),
    remark: findColumn_(headers, ["remark"]),
    source: findColumn_(headers, ["source"]),
    beforeTotalPieces: findColumn_(headers, ["before_total_pieces"]),
    afterTotalPieces: findColumn_(headers, ["after_total_pieces"])
  };
}

function findColumn_(headers, candidates) {
  const normalizedHeaders = (Array.isArray(headers) ? headers : []).map(normalizeHeader_);
  const list = Array.isArray(candidates) ? candidates : [];
  for (let i = 0; i < list.length; i++) {
    const wanted = normalizeHeader_(list[i]);
    const index = normalizedHeaders.indexOf(wanted);
    if (index !== -1) return index;
  }
  return -1;
}

function getRequiredSheet_(sheetName) {
  const sheet = getOptionalSheet_(sheetName);
  if (!sheet) {
    throw new Error("Feuille introuvable: " + sheetName);
  }
  return sheet;
}

function getOptionalSheet_(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
}

function getRowCell_(row, index) {
  if (!Array.isArray(row) || index < 0 || index >= row.length) return "";
  return row[index];
}

function normalizeHeader_(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeReference_(value) {
  return String(value || "").toUpperCase().replace(/\s+/g, " ").trim();
}

function parseLooseInteger_(value) {
  if (value === null || typeof value === "undefined" || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  const match = String(value).match(/-?\d+/);
  return match ? Math.max(0, Math.trunc(Number(match[0]) || 0)) : 0;
}

function parsePositiveNumber_(value) {
  if (value === null || typeof value === "undefined" || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  const normalized = String(value).trim().replace(",", ".");
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function normalizeSign_(value) {
  const sign = String(value || "").trim();
  return sign === "+" || sign === "×" || sign === "x" || sign === "X" ? (sign === "+" ? "+" : "×") : "";
}

function normalizeHistoryActionType_(value) {
  const text = normalizeHeader_(value);
  if (!text) return "";
  if (text === "entry" || text === "entree" || text === "entrée") return "entry";
  if (text === "exit" || text === "sortie" || text === "sortie_rapide") return "exit";
  if (text === "adjustment" || text === "ajustement" || text === "modifier") return "adjustment";
  return String(value || "").trim();
}

function normalizeFractionText_(value) {
  const text = String(value === null || typeof value === "undefined" ? "" : value).trim().replace(/\s+/g, "");
  if (!text) return "";
  const match = text.match(/^(\d+)\/(\d+)$/);
  return match ? match[1] + "/" + match[2] : "";
}

function parseFractionValue_(value) {
  if (value === null || typeof value === "undefined" || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  const text = String(value).trim().replace(",", ".");
  const fractionMatch = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    return numerator > 0 && denominator > 0 ? numerator / denominator : 0;
  }
  const numberValue = Number(text);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function fractionToText_(value) {
  const numeric = Number(value || 0);
  if (!(numeric > 0)) return "";
  const common = [
    [0.5, "1/2"],
    [1 / 3, "1/3"],
    [2 / 3, "2/3"],
    [0.25, "1/4"],
    [0.75, "3/4"],
    [1 / 6, "1/6"],
    [5 / 6, "5/6"]
  ];
  for (let i = 0; i < common.length; i++) {
    if (Math.abs(common[i][0] - numeric) < 0.0001) return common[i][1];
  }
  return String(numeric);
}

function normalizePackNotation_(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^([+-])\s*(\d+)\s*包$/i);
  if (!match) return "";
  const count = Math.max(0, Math.trunc(Number(match[2]) || 0));
  return count > 0 ? match[1] + count + "包" : "";
}

function buildStockDisplay_(stateInput) {
  const state = stateInput || {};
  const tail = Math.max(0, parseLooseInteger_(state.tail));
  const unitsPerBox = Math.max(0, parseLooseInteger_(state.unitsPerBox));
  const itemBoxes = Math.max(0, parseLooseInteger_(state.itemBoxes));
  const sign = normalizeSign_(state.sign);
  const fractionText = normalizeFractionText_(state.fractionText) || fractionToText_(state.fractionValue);
  const packNotation = normalizePackNotation_(state.packNotation);

  const tailDisplay = tail > 0 ? "(" + tail + "p)" : "";
  let core = "";
  if (unitsPerBox > 0 && (itemBoxes > 0 || !!fractionText)) {
    core = String(unitsPerBox) + "p";
    if (sign === "×" && fractionText) {
      core += itemBoxes > 1 ? ("×" + itemBoxes + "×" + fractionText) : ("×" + fractionText);
    } else if (sign === "+" && fractionText) {
      core += "×" + itemBoxes + "+" + fractionText;
    } else if (itemBoxes > 0) {
      core += "×" + itemBoxes;
    }
  }

  let display = "";
  if (tailDisplay) display = tailDisplay + (core ? "+" + core : "");
  else display = core || "-";
  return packNotation ? (display === "-" ? packNotation : display + packNotation) : display;
}

function stateModelToPieces_(stateInput) {
  const state = stateInput || {};
  const tail = Math.max(0, parseLooseInteger_(state.tail));
  const unitsPerBox = Math.max(0, parseLooseInteger_(state.unitsPerBox));
  const itemBoxes = Math.max(0, parseLooseInteger_(state.itemBoxes));
  const sign = normalizeSign_(state.sign);
  const fractionValue = parseFractionValue_(state.fractionText || state.fractionValue);
  let total = tail + (unitsPerBox * itemBoxes);
  if (unitsPerBox > 0 && fractionValue > 0) {
    total += sign === "×" ? Math.round(unitsPerBox * fractionValue * Math.max(1, itemBoxes || 1)) : Math.round(unitsPerBox * fractionValue);
  }
  return Math.max(0, total);
}

function computeStockState_(stateInput) {
  return stateModelToPieces_(stateInput) > 0 ? "positive" : "zero";
}

function historyTimestampRaw_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  const text = String(value || "").trim();
  if (!text) return "";
  const date = new Date(text);
  return isNaN(date.getTime()) ? text : date.toISOString();
}

function formatHistoryTimestamp_(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!(date instanceof Date) || isNaN(date.getTime())) return String(value || "").trim();
  const timeZone = Session.getScriptTimeZone ? Session.getScriptTimeZone() : "Europe/Paris";
  return Utilities.formatDate(date, timeZone || "Europe/Paris", "dd/MM HH:mm");
}

function applyMutationPayload_(payload) {
  const mutation = payload && payload.mutation ? payload.mutation : payload;
  if (!mutation || mutation.type !== "quick_edit") {
    throw new Error("Mutation non supportée.");
  }
  return applyQuickEditMutation_(mutation);
}

function applyQuickEditMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : null;
  if (!request) {
    throw new Error("Payload quick edit manquant.");
  }

  const sheet = getRequiredSheet_(SZFASHION_STOCK_SHEET);
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw new Error("La feuille STOCK ne contient aucun en-tête.");
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const cols = resolveInventoryColumns_(headers);
  if (cols.reference < 0) {
    throw new Error("Colonne référence introuvable dans STOCK.");
  }

  const targetRowIndex = findInventoryRowIndex_(sheet, cols, mutation);
  if (targetRowIndex < 2) {
    throw new Error("Ligne stock introuvable pour la mutation.");
  }

  const beforeDisplayRow = sheet.getRange(targetRowIndex, 1, 1, lastCol).getDisplayValues()[0];
  const beforeItem = buildInventoryItem_(beforeDisplayRow, cols, targetRowIndex);
  if (!beforeItem) {
    throw new Error("Impossible de charger l'article avant mutation.");
  }

  writeQuickEditToStockRow_(sheet, cols, targetRowIndex, request, beforeItem);

  const afterDisplayRow = sheet.getRange(targetRowIndex, 1, 1, lastCol).getDisplayValues()[0];
  const afterItem = buildInventoryItem_(afterDisplayRow, cols, targetRowIndex);
  if (!afterItem) {
    throw new Error("Impossible de relire l'article après mutation.");
  }

  const historyEntry = appendHistoryForMutation_(mutation, beforeItem, afterItem);

  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    item: afterItem,
    historyEntry: historyEntry,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function findInventoryRowIndex_(sheet, cols, mutation) {
  const request = mutation && mutation.request ? mutation.request : {};
  const itemId = String(mutation && mutation.itemId || request.id || "");
  const itemIdMatch = itemId.match(/^row_(\d+)$/);
  if (itemIdMatch) {
    const rowIndex = Number(itemIdMatch[1]);
    if (rowIndex >= 2 && rowIndex <= sheet.getLastRow()) {
      const currentReference = normalizeReference_(sheet.getRange(rowIndex, cols.reference + 1).getDisplayValue());
      const expectedReference = normalizeReference_(mutation.reference || request.reference);
      if (!expectedReference || currentReference === expectedReference) {
        return rowIndex;
      }
    }
  }

  const expectedReference = normalizeReference_(mutation.reference || request.reference);
  if (!expectedReference) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const references = sheet.getRange(2, cols.reference + 1, lastRow - 1, 1).getDisplayValues();
  for (let index = 0; index < references.length; index++) {
    if (normalizeReference_(references[index][0]) === expectedReference) {
      return index + 2;
    }
  }
  return -1;
}

function writeQuickEditToStockRow_(sheet, cols, rowIndex, request, beforeItem) {
  writeCellIfPresent_(sheet, rowIndex, cols.tailRaw, Math.max(0, parseLooseInteger_(request.tail)));
  writeCellIfPresent_(sheet, rowIndex, cols.unitsPerBoxRaw, Math.max(0, parseLooseInteger_(request.unitsPerBox || beforeItem.unitsPerBox)));
  writeCellIfPresent_(sheet, rowIndex, cols.boxesRaw, Math.max(0, parseLooseInteger_(request.itemBoxes)));
  writeCellIfPresent_(sheet, rowIndex, cols.signRaw, normalizeSign_(request.sign));
  writeCellIfPresent_(sheet, rowIndex, cols.fractionRaw, normalizeFractionText_(request.fractionText));
  writeCellIfPresent_(sheet, rowIndex, cols.packNotation, normalizePackNotation_(request.packNotation));
  writeCellIfPresent_(sheet, rowIndex, cols.remark, String(request.remark || "").trim());
}

function writeCellIfPresent_(sheet, rowIndex, columnIndex, value) {
  if (columnIndex < 0) return;
  sheet.getRange(rowIndex, columnIndex + 1).setValue(value);
}

function toSheetText_(value) {
  return String(value == null ? "" : value).trim();
}

function escapeFormulaText_(value) {
  return String(value == null ? "" : value).replace(/"/g, '""');
}

function writeHistoryReferenceCell_(range, value) {
  const text = toSheetText_(value);
  range
    .setNumberFormat("@")
    .clearContent()
    .setFormula('="' + escapeFormulaText_(text) + '"');
  SpreadsheetApp.flush();
}

function appendHistoryForMutation_(mutation, beforeItem, afterItem) {
  const sheet = getOrCreateHistorySheet_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const cols = resolveHistoryColumns_(headers);
  const timestamp = new Date();
  const actionType = normalizeHistoryActionType_(mutation.actionType || (mutation.request && mutation.request.localActionType) || "adjustment") || "adjustment";
  const remark = String(mutation.request && mutation.request.remark || "").trim();
  const referenceText = String(afterItem.reference || "").trim();
  const row = [
    timestamp,
    actionType,
    referenceText,
    String(afterItem.id || ""),
    String(beforeItem.stockDisplay || ""),
    String(afterItem.stockDisplay || ""),
    remark,
    "stock_mobile_sync",
    Number(stateModelToPieces_(beforeItem) || 0),
    Number(stateModelToPieces_(afterItem) || 0)
  ];
  if (cols.reference >= 0) {
    row[cols.reference] = "";
  }
  console.log(
    "appendHistory before write referenceText=%s cols.reference=%s rowReference=%s",
    referenceText,
    String(cols.reference),
    cols.reference >= 0 ? String(row[cols.reference] || "") : ""
  );
  const targetRow = sheet.getLastRow() + 1;
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  if (cols.reference >= 0) {
    const referenceRange = sheet.getRange(targetRow, cols.reference + 1);
    writeHistoryReferenceCell_(referenceRange, referenceText);
    console.log(
      "appendHistory after write reference getValue=%s getDisplayValue=%s getFormula=%s getNumberFormat=%s",
      String(referenceRange.getValue() || ""),
      String(referenceRange.getDisplayValue() || ""),
      String(referenceRange.getFormula() || ""),
      String(referenceRange.getNumberFormat() || "")
    );
  }

  return {
    id: "srv-his-" + String(targetRow),
    timestampRaw: timestamp.toISOString(),
    timestampLabel: formatHistoryTimestamp_(timestamp),
    actionType: actionType,
    reference: referenceText,
    rowId: String(afterItem.id || ""),
    beforeDisplay: String(beforeItem.stockDisplay || ""),
    afterDisplay: String(afterItem.stockDisplay || ""),
    remark: remark,
    source: "stock_mobile_sync",
    beforeTotalPieces: Number(stateModelToPieces_(beforeItem) || 0),
    afterTotalPieces: Number(stateModelToPieces_(afterItem) || 0)
  };
}

function getOrCreateHistorySheet_() {
  const existing = getOptionalSheet_(SZFASHION_HISTORY_SHEET);
  if (existing) {
    ensureHistoryHeaders_(existing);
    return existing;
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SZFASHION_HISTORY_SHEET);
  ensureHistoryHeaders_(sheet);
  return sheet;
}

function ensureHistoryHeaders_(sheet) {
  const headers = [
    "timestamp",
    "action_type",
    "reference",
    "row_id",
    "before_display",
    "after_display",
    "remark",
    "source",
    "before_total_pieces",
    "after_total_pieces"
  ];
  const lastCol = sheet.getLastColumn();
  const firstRow = lastCol > 0 ? sheet.getRange(1, 1, 1, Math.max(lastCol, headers.length)).getDisplayValues()[0] : [];
  const normalizedFirst = firstRow.map(normalizeHeader_);
  const matches = headers.every(function(header, index) {
    return normalizedFirst[index] === normalizeHeader_(header);
  });
  if (!matches) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  const referenceColumnIndex = headers.indexOf("reference");
  if (referenceColumnIndex >= 0) {
    sheet.getRange(1, referenceColumnIndex + 1, Math.max(sheet.getMaxRows(), 1), 1).setNumberFormat("@");
  }
}
