const SZFASHION_STOCK_SHEET = "STOCK";
const SZFASHION_HISTORY_SHEET = "STOCK_HISTORY";
const SZFASHION_ARRIVALS_SHEET = "ARRIVAGES_DB";
const SZFASHION_TICKETS_SHEET = "WAREHOUSE_TICKETS";
const SZFASHION_TICKET_LINES_SHEET = "WAREHOUSE_TICKET_LINES";

function getInventoryPayload_() {
  const sheet = getRequiredSheet_(SZFASHION_STOCK_SHEET);
  const arrivalsByReference = readArrivalsUpdatedAtLookup_();
  const items = enrichInventoryItemsWithArrivalDates_(readInventoryItems_(sheet), arrivalsByReference);
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
  const items = enrichInventoryItemsWithArrivalDates_(readInventoryItems_(sheet), readArrivalsUpdatedAtLookup_());
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
  if (cols.reference < 0) {
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
    arrivalNote: arrivalNote,
    arrivalUpdatedAt: "",
    arrivalUpdatedAtLabel: "",
    arrivalUpdatedAtSort: 0
  };
}

function enrichInventoryItemsWithArrivalDates_(items, arrivalsByReference) {
  const lookup = arrivalsByReference || {};
  return (Array.isArray(items) ? items : []).map(function(item) {
    const referenceKey = normalizeReference_(item && item.reference);
    const arrival = referenceKey ? lookup[referenceKey] : null;
    if (!arrival) return item;
    return Object.assign({}, item, {
      arrivalNote: String(arrival.arrivalId || item.arrivalNote || ""),
      arrivalUpdatedAt: String(arrival.raw || ""),
      arrivalUpdatedAtLabel: String(arrival.label || ""),
      arrivalUpdatedAtSort: Number(arrival.sort || 0),
      arrivalWarehouse: String(arrival.warehouse || "")
    });
  });
}

function readArrivalsUpdatedAtLookup_() {
  const sheet = getOptionalSheet_(SZFASHION_ARRIVALS_SHEET);
  if (!sheet) return {};
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return {};

  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const referenceColumn = findColumn_(headers, ["货号", "Reference", "Référence", "ref"]);
  const arrivalIdColumn = findColumn_(headers, ["ArrivageID", "到货单", "arrivalNote", "arrival", "ASN", "asn", "deliveryNote", "bon de livraison"]);
  const updatedAtColumn = findColumn_(headers, ["UpdatedAt", "updatedAt", "updated_at"]);
  const warehouseColumn = findColumn_(headers, ["Entrepot", "Entrepôt", "仓库"]);
  if (referenceColumn < 0 || updatedAtColumn < 0) return {};

  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const displayValues = range.getDisplayValues();
  const rawValues = range.getValues();
  const lookup = {};

  for (let index = 0; index < rawValues.length; index++) {
    const referenceKey = normalizeReference_(getRowCell_(displayValues[index], referenceColumn));
    if (!referenceKey) continue;
    const parsed = parseArrivalUpdatedAt_(getRowCell_(rawValues[index], updatedAtColumn), getRowCell_(displayValues[index], updatedAtColumn));
    const arrival = Object.assign({}, parsed, {
      arrivalId: String(getRowCell_(displayValues[index], arrivalIdColumn) || "").trim(),
      warehouse: String(getRowCell_(displayValues[index], warehouseColumn) || "").trim()
    });
    if (!lookup[referenceKey] || Number(arrival.sort || 0) > Number(lookup[referenceKey].sort || 0)) {
      lookup[referenceKey] = arrival;
    }
  }

  return lookup;
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
    afterTotalPieces: Number(getRowCell_(rawRow, cols.afterTotalPieces) || 0),
    beforeTimestampRaw: historyTimestampRaw_(getRowCell_(rawRow, cols.beforeTimestamp)),
    beforeTimestampLabel: formatHistoryTimestamp_(getRowCell_(rawRow, cols.beforeTimestamp)),
    movementDisplay: String(getRowCell_(displayRow, cols.movementDisplay) || "").trim()
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
    afterTotalPieces: findColumn_(headers, ["after_total_pieces"]),
    beforeTimestamp: findColumn_(headers, ["before_timestamp"]),
    movementDisplay: findColumn_(headers, ["movement_display"])
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

function normalizeArrivalNoteKey_(value) {
  return String(value || "").toUpperCase().replace(/\s+/g, " ").trim();
}

function parseArrivalUpdatedAt_(rawValue, displayValue) {
  const label = String(displayValue || "").trim();
  let date = rawValue instanceof Date && !isNaN(rawValue.getTime()) ? rawValue : null;
  let hasTime = date ? hasTimePart_(date) : false;
  if (!date && typeof rawValue === "number" && isFinite(rawValue)) {
    const millis = Math.round((rawValue - 25569) * 86400000);
    date = new Date(millis);
    hasTime = Math.abs(rawValue - Math.floor(rawValue)) > 0.000001;
  }
  if (!date) {
    const text = String(rawValue || displayValue || "").trim();
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (match) {
      hasTime = typeof match[4] !== "undefined";
      date = new Date(
        Number(match[3]),
        Number(match[2]) - 1,
        Number(match[1]),
        Number(match[4] || 0),
        Number(match[5] || 0),
        Number(match[6] || 0)
      );
    } else {
      const parsed = new Date(text);
      date = isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  if (!date || isNaN(date.getTime())) {
    return { raw: String(rawValue || displayValue || "").trim(), label: label, sort: 0 };
  }

  return {
    raw: date.toISOString(),
    label: hasTime ? formatArrivalTimestamp_(date) : (label || formatArrivalDate_(date)),
    sort: date.getTime()
  };
}

function hasTimePart_(date) {
  return !!date && (date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0);
}

function formatArrivalDate_(date) {
  const timeZone = Session.getScriptTimeZone ? Session.getScriptTimeZone() : "Europe/Paris";
  return Utilities.formatDate(date, timeZone || "Europe/Paris", "dd/MM/yyyy");
}

function formatArrivalTimestamp_(date) {
  const timeZone = Session.getScriptTimeZone ? Session.getScriptTimeZone() : "Europe/Paris";
  return Utilities.formatDate(date, timeZone || "Europe/Paris", "dd/MM/yyyy HH:mm");
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

function reduceMovementFraction_(num, den) {
  function gcd_(left, right) {
    return right ? gcd_(right, left % right) : left;
  }
  const safeNum = Math.max(0, parseLooseInteger_(num));
  const safeDen = Math.max(1, parseLooseInteger_(den));
  const divisor = gcd_(safeNum, safeDen);
  return {
    num: safeNum / divisor,
    den: safeDen / divisor
  };
}

function buildFractionPackMovementParts_(totalPieces, unitsPerBox, packSize) {
  const total = Math.max(0, Math.round(Number(totalPieces || 0)));
  const units = Math.max(0, parseLooseInteger_(unitsPerBox));
  const colisage = Math.max(0, parseLooseInteger_(packSize));
  if (!(total > 0) || !(units > 0) || !(colisage > 0)) return null;

  const candidateDenominators = [2, 3, 4, 5, 6, 8, 10, 12];
  for (let i = 0; i < candidateDenominators.length; i++) {
    const den = candidateDenominators[i];
    for (let num = 1; num < den; num++) {
      const fractionPieces = (units * num) / den;
      if (Math.floor(fractionPieces) !== fractionPieces) continue;
      if (fractionPieces > total) continue;
      const remaining = total - fractionPieces;
      if (remaining < 0 || remaining % colisage !== 0) continue;
      const packs = remaining / colisage;
      if (packs <= 0) continue;
      return {
        fractionText: num + "/" + den + "箱",
        packsText: packs + "包"
      };
    }
  }
  return null;
}

function formatMovementDisplayFromPieces_(beforePieces, afterPieces, unitsPerBox, colisage) {
  const before = Math.round(Number(beforePieces || 0));
  const after = Math.round(Number(afterPieces || 0));
  const delta = after - before;
  if (!isFinite(delta) || delta === 0) return "";

  const sign = delta > 0 ? "+" : "-";
  const total = Math.abs(delta);
  const units = Math.max(0, parseLooseInteger_(unitsPerBox));
  const packSize = Math.max(0, parseLooseInteger_(colisage));

  if (units > 0) {
    const boxes = Math.floor(total / units);
    const remainder = total - (boxes * units);
    const parts = [];
    if (boxes > 0) parts.push(boxes + "箱");
    if (remainder === 0) return sign + parts.join(" ");
    if (packSize > 0 && remainder % packSize === 0) {
      const packs = remainder / packSize;
      if (packs > 0) parts.push(packs + "包");
      return parts.length ? sign + parts.join(" ") : "";
    }
    const fractionPackParts = buildFractionPackMovementParts_(remainder, units, packSize);
    if (fractionPackParts) {
      parts.push(fractionPackParts.fractionText);
      parts.push(fractionPackParts.packsText);
      return sign + parts.join(" ");
    }
    const fraction = reduceMovementFraction_(remainder, units);
    if (fraction.num > 0 && fraction.den <= 12) {
      parts.push(fraction.num + "/" + fraction.den + "箱");
      return sign + parts.join(" ");
    }
    return "";
  }

  if (packSize > 0 && total % packSize === 0) {
    return sign + (total / packSize) + "包";
  }

  return "";
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
  if (!mutation) {
    throw new Error("Mutation non supportée.");
  }
  if (mutation.type === "quick_edit") return applyQuickEditMutation_(mutation);
  if (mutation.type === "product_remark") return applyProductRemarkMutation_(mutation);
  if (String(mutation.type || "").indexOf("ticket_") === 0) return applyTicketMutationPayload_(mutation);
  throw new Error("Mutation non supportée.");
}

function validateTicketPayload_(payload) {
  const mutation = payload && payload.mutation ? payload.mutation : payload;
  if (!mutation || mutation.type !== "ticket_validate") {
    throw new Error("Payload validation billet manquant.");
  }
  return applyTicketValidationMutation_(mutation);
}

function applyProductRemarkMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : null;
  if (!request) {
    throw new Error("Payload remarque produit manquant.");
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
  if (cols.remark < 0) {
    throw new Error("Colonne remarque produit introuvable dans STOCK.");
  }

  const targetRowIndex = findInventoryRowIndex_(sheet, cols, mutation);
  if (targetRowIndex < 2) {
    throw new Error("Ligne stock introuvable pour la mutation.");
  }

  writeCellIfPresent_(sheet, targetRowIndex, cols.remark, String(request.remark || "").trim());
  const afterDisplayRow = sheet.getRange(targetRowIndex, 1, 1, lastCol).getDisplayValues()[0];
  const afterItem = buildInventoryItem_(afterDisplayRow, cols, targetRowIndex);
  if (!afterItem) {
    throw new Error("Impossible de relire l'article après mutation.");
  }

  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    item: afterItem,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
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
  const beforeTimestampRaw = findLatestHistoryTimestampForReference_(sheet, cols, referenceText);
  const beforeTotalPieces = Number(stateModelToPieces_(beforeItem) || 0);
  const afterTotalPieces = Number(stateModelToPieces_(afterItem) || 0);
  const movementDisplay = formatMovementDisplayFromPieces_(
    beforeTotalPieces,
    afterTotalPieces,
    afterItem.unitsPerBox || beforeItem.unitsPerBox,
    afterItem.colisage || beforeItem.colisage
  );
  const row = [
    timestamp,
    actionType,
    referenceText,
    String(afterItem.id || ""),
    String(beforeItem.stockDisplay || ""),
    String(afterItem.stockDisplay || ""),
    remark,
    "stock_mobile_sync",
    beforeTotalPieces,
    afterTotalPieces
  ];
  if (cols.beforeTimestamp >= 0) {
    row[cols.beforeTimestamp] = beforeTimestampRaw;
  }
  if (cols.movementDisplay >= 0) {
    row[cols.movementDisplay] = movementDisplay;
  }
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
    beforeTotalPieces: beforeTotalPieces,
    afterTotalPieces: afterTotalPieces,
    beforeTimestampRaw: beforeTimestampRaw,
    beforeTimestampLabel: beforeTimestampRaw ? formatHistoryTimestamp_(beforeTimestampRaw) : "",
    movementDisplay: movementDisplay
  };
}

function findLatestHistoryTimestampForReference_(sheet, cols, reference) {
  if (!sheet || cols.reference < 0 || cols.timestamp < 0 || !reference) return "";
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return "";
  const rawRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const displayRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  const normalizedReference = normalizeReference_(reference);
  for (let index = displayRows.length - 1; index >= 0; index--) {
    if (normalizeReference_(getRowCell_(displayRows[index], cols.reference)) === normalizedReference) {
      return historyTimestampRaw_(getRowCell_(rawRows[index], cols.timestamp));
    }
  }
  return "";
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
    "after_total_pieces",
    "before_timestamp",
    "movement_display"
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

function getTicketsPayload_() {
  const tickets = readTickets_();
  return {
    tickets: tickets,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function getTicketDetailPayload_(ticketId) {
  const ticket = readTicketById_(ticketId);
  return {
    ticket: ticket,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function applyTicketMutationPayload_(mutation) {
  const type = String(mutation && mutation.type || "");
  if (type === "ticket_validate") {
    return applyTicketValidationMutation_(mutation);
  }

  const ticketSheet = getOrCreateTicketsSheet_();
  const lineSheet = getOrCreateTicketLinesSheet_();
  ensureTicketsHeaders_(ticketSheet);
  ensureTicketLinesHeaders_(lineSheet);

  if (type === "ticket_create") {
    return applyTicketCreateMutation_(ticketSheet, mutation);
  }
  if (type === "ticket_update_meta") {
    return applyTicketMetaMutation_(ticketSheet, mutation);
  }
  if (type === "ticket_change_status") {
    return applyTicketStatusMutation_(ticketSheet, mutation);
  }
  if (type === "ticket_add_line") {
    return applyTicketAddLineMutation_(ticketSheet, lineSheet, mutation);
  }
  if (type === "ticket_update_line") {
    return applyTicketUpdateLineMutation_(ticketSheet, lineSheet, mutation);
  }
  if (type === "ticket_delete_line") {
    return applyTicketDeleteLineMutation_(ticketSheet, lineSheet, mutation);
  }
  throw new Error("Mutation billet non supportée.");
}

function applyTicketCreateMutation_(ticketSheet, mutation) {
  const request = mutation && mutation.request ? mutation.request : {};
  const ticket = normalizeTicketPayload_(request.ticket || {});
  if (!ticket.id) throw new Error("Billet invalide.");
  const existingRow = findTicketRowIndexById_(ticketSheet, ticket.id);
  if (existingRow >= 2) {
    return {
      ok: true,
      mutationId: String(mutation.id || ""),
      ticket: readTicketById_(ticket.id),
      generatedAt: new Date().toISOString(),
      source: "google_sheets"
    };
  }
  appendTicketRow_(ticketSheet, ticket);
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: readTicketById_(ticket.id),
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function applyTicketMetaMutation_(ticketSheet, mutation) {
  const request = mutation && mutation.request ? mutation.request : {};
  const ticketId = String(mutation.ticketId || request.ticketId || "");
  const rowIndex = findTicketRowIndexById_(ticketSheet, ticketId);
  if (rowIndex < 2) throw new Error("Billet introuvable.");
  const cols = resolveTicketColumns_(ticketSheet.getRange(1, 1, 1, ticketSheet.getLastColumn()).getDisplayValues()[0]);
  writeCellIfPresent_(ticketSheet, rowIndex, cols.title, String(request.title || ""));
  writeCellIfPresent_(ticketSheet, rowIndex, cols.note, String(request.note || ""));
  writeCellIfPresent_(ticketSheet, rowIndex, cols.updatedAt, new Date());
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: readTicketById_(ticketId),
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function applyTicketStatusMutation_(ticketSheet, mutation) {
  const request = mutation && mutation.request ? mutation.request : {};
  const ticketId = String(mutation.ticketId || request.ticketId || "");
  const nextStatus = String(request.status || "pending");
  const rowIndex = findTicketRowIndexById_(ticketSheet, ticketId);
  if (rowIndex < 2) throw new Error("Billet introuvable.");
  const cols = resolveTicketColumns_(ticketSheet.getRange(1, 1, 1, ticketSheet.getLastColumn()).getDisplayValues()[0]);
  writeCellIfPresent_(ticketSheet, rowIndex, cols.status, nextStatus);
  writeCellIfPresent_(ticketSheet, rowIndex, cols.updatedAt, new Date());
  if (nextStatus === "cancelled") {
    writeCellIfPresent_(ticketSheet, rowIndex, cols.cancelledAt, new Date());
  }
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: readTicketById_(ticketId),
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function applyTicketAddLineMutation_(ticketSheet, lineSheet, mutation) {
  const request = mutation && mutation.request ? mutation.request : {};
  const ticketId = String(mutation.ticketId || request.ticketId || "");
  if (findTicketRowIndexById_(ticketSheet, ticketId) < 2) throw new Error("Billet introuvable.");
  appendTicketLineRow_(lineSheet, ticketId, normalizeTicketLinePayload_(request.line || {}));
  touchTicketUpdatedAt_(ticketSheet, ticketId);
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: readTicketById_(ticketId),
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function applyTicketUpdateLineMutation_(ticketSheet, lineSheet, mutation) {
  const request = mutation && mutation.request ? mutation.request : {};
  const ticketId = String(mutation.ticketId || request.ticketId || "");
  const lineId = String(request.lineId || "");
  const rowIndex = findTicketLineRowIndexById_(lineSheet, lineId);
  if (rowIndex < 2) throw new Error("Ligne billet introuvable.");
  const cols = resolveTicketLineColumns_(lineSheet.getRange(1, 1, 1, lineSheet.getLastColumn()).getDisplayValues()[0]);
  const patch = request.patch || {};
  if (Object.prototype.hasOwnProperty.call(patch, "reference")) writeCellIfPresent_(lineSheet, rowIndex, cols.reference, String(patch.reference || ""));
  if (Object.prototype.hasOwnProperty.call(patch, "requestedBoxes")) writeCellIfPresent_(lineSheet, rowIndex, cols.requestedBoxes, Math.max(0, parseLooseInteger_(patch.requestedBoxes)));
  if (Object.prototype.hasOwnProperty.call(patch, "requestedPacks")) writeCellIfPresent_(lineSheet, rowIndex, cols.requestedPacks, Math.max(0, parseLooseInteger_(patch.requestedPacks)));
  if (Object.prototype.hasOwnProperty.call(patch, "preparedBoxes")) writeCellIfPresent_(lineSheet, rowIndex, cols.preparedBoxes, Math.max(0, parseLooseInteger_(patch.preparedBoxes)));
  if (Object.prototype.hasOwnProperty.call(patch, "preparedPacks")) writeCellIfPresent_(lineSheet, rowIndex, cols.preparedPacks, Math.max(0, parseLooseInteger_(patch.preparedPacks)));
  if (Object.prototype.hasOwnProperty.call(patch, "validatedBoxes")) writeCellIfPresent_(lineSheet, rowIndex, cols.validatedBoxes, Math.max(0, parseLooseInteger_(patch.validatedBoxes)));
  if (Object.prototype.hasOwnProperty.call(patch, "validatedPacks")) writeCellIfPresent_(lineSheet, rowIndex, cols.validatedPacks, Math.max(0, parseLooseInteger_(patch.validatedPacks)));
  if (Object.prototype.hasOwnProperty.call(patch, "lineStatus")) writeCellIfPresent_(lineSheet, rowIndex, cols.lineStatus, String(patch.lineStatus || "pending"));
  if (Object.prototype.hasOwnProperty.call(patch, "note")) writeCellIfPresent_(lineSheet, rowIndex, cols.note, String(patch.note || ""));
  writeCellIfPresent_(lineSheet, rowIndex, cols.updatedAt, new Date());
  touchTicketUpdatedAt_(ticketSheet, ticketId);
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: readTicketById_(ticketId),
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function applyTicketDeleteLineMutation_(ticketSheet, lineSheet, mutation) {
  const request = mutation && mutation.request ? mutation.request : {};
  const ticketId = String(mutation.ticketId || request.ticketId || "");
  const lineId = String(request.lineId || "");
  const rowIndex = findTicketLineRowIndexById_(lineSheet, lineId);
  if (rowIndex < 2) throw new Error("Ligne billet introuvable.");
  lineSheet.deleteRow(rowIndex);
  touchTicketUpdatedAt_(ticketSheet, ticketId);
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: readTicketById_(ticketId),
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function applyTicketValidationMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : {};
  const ticketId = String(mutation.ticketId || request.ticketId || "");
  const ticketSheet = getOrCreateTicketsSheet_();
  const lineSheet = getOrCreateTicketLinesSheet_();
  ensureTicketsHeaders_(ticketSheet);
  ensureTicketLinesHeaders_(lineSheet);
  const ticketRowIndex = findTicketRowIndexById_(ticketSheet, ticketId);
  if (ticketRowIndex < 2) throw new Error("Billet introuvable.");

  const ticketCols = resolveTicketColumns_(ticketSheet.getRange(1, 1, 1, ticketSheet.getLastColumn()).getDisplayValues()[0]);
  const ticketRow = ticketSheet.getRange(ticketRowIndex, 1, 1, ticketSheet.getLastColumn()).getDisplayValues()[0];
  const currentValidationMutationId = String(getRowCell_(ticketRow, ticketCols.validationMutationId) || "").trim();
  const currentStatus = String(getRowCell_(ticketRow, ticketCols.status) || "").trim();
  if (currentStatus === "validated" && currentValidationMutationId && currentValidationMutationId === String(mutation.id || "")) {
    return {
      ok: true,
      mutationId: String(mutation.id || ""),
      ticket: readTicketById_(ticketId),
      generatedAt: new Date().toISOString(),
      source: "google_sheets"
    };
  }

  const ticket = readTicketById_(ticketId);
  if (!ticket) throw new Error("Billet introuvable.");

  const historyEntries = [];
  for (let i = 0; i < ticket.lines.length; i++) {
    const line = ticket.lines[i];
    const validatedBoxes = Math.max(0, parseLooseInteger_(line.validatedBoxes));
    const validatedPacks = Math.max(0, parseLooseInteger_(line.validatedPacks));
    if (!(validatedBoxes > 0 || validatedPacks > 0)) continue;
    const stockChange = applyTicketLineToStock_(ticket, line, mutation);
    if (stockChange && stockChange.historyEntry) historyEntries.push(stockChange.historyEntry);
  }

  const validatedAt = request.validatedAt ? new Date(request.validatedAt) : new Date();
  writeCellIfPresent_(ticketSheet, ticketRowIndex, ticketCols.status, "validated");
  writeCellIfPresent_(ticketSheet, ticketRowIndex, ticketCols.validatedAt, validatedAt);
  writeCellIfPresent_(ticketSheet, ticketRowIndex, ticketCols.updatedAt, validatedAt);
  writeCellIfPresent_(ticketSheet, ticketRowIndex, ticketCols.validationMutationId, String(mutation.id || ""));

  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: readTicketById_(ticketId),
    historyEntries: historyEntries,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function applyTicketLineToStock_(ticket, line, mutation) {
  const reference = normalizeReference_(line.reference);
  if (!reference) return null;
  const stockSheet = getRequiredSheet_(SZFASHION_STOCK_SHEET);
  const stockHeaders = stockSheet.getRange(1, 1, 1, stockSheet.getLastColumn()).getDisplayValues()[0];
  const stockCols = resolveInventoryColumns_(stockHeaders);
  const rowIndex = findInventoryRowIndex_(stockSheet, stockCols, {
    reference: reference,
    request: { reference: reference }
  });
  if (rowIndex < 2) {
    throw new Error("Référence billet introuvable dans STOCK : " + reference);
  }
  const beforeDisplayRow = stockSheet.getRange(rowIndex, 1, 1, stockSheet.getLastColumn()).getDisplayValues()[0];
  const beforeItem = buildInventoryItem_(beforeDisplayRow, stockCols, rowIndex);
  if (!beforeItem) throw new Error("Impossible de lire le stock pour " + reference);

  const piecesToRemove = computeTicketLinePieces_(line, beforeItem);
  const beforePieces = Number(stateModelToPieces_(beforeItem) || 0);
  if (piecesToRemove > beforePieces) {
    throw new Error("Stock insuffisant pour " + reference + ".");
  }
  const nextState = decomposePiecesToStateModel_(beforePieces - piecesToRemove, beforeItem.unitsPerBox, beforeItem.colisage, beforeItem.remark);
  writeCellIfPresent_(stockSheet, rowIndex, stockCols.tailRaw, nextState.tail);
  writeCellIfPresent_(stockSheet, rowIndex, stockCols.unitsPerBoxRaw, nextState.unitsPerBox);
  writeCellIfPresent_(stockSheet, rowIndex, stockCols.boxesRaw, nextState.itemBoxes);
  writeCellIfPresent_(stockSheet, rowIndex, stockCols.signRaw, nextState.sign);
  writeCellIfPresent_(stockSheet, rowIndex, stockCols.fractionRaw, nextState.fractionText);
  writeCellIfPresent_(stockSheet, rowIndex, stockCols.packNotation, nextState.packNotation);

  const afterDisplayRow = stockSheet.getRange(rowIndex, 1, 1, stockSheet.getLastColumn()).getDisplayValues()[0];
  const afterItem = buildInventoryItem_(afterDisplayRow, stockCols, rowIndex);
  const historyEntry = appendHistoryForMutation_({
    id: String(mutation.id || ""),
    actionType: "exit",
    request: {
      remark: buildTicketHistoryRemark_(ticket, line)
    }
  }, beforeItem, afterItem);
  return {
    item: afterItem,
    historyEntry: historyEntry
  };
}

function buildTicketHistoryRemark_(ticket, line) {
  const base = "Billet " + String(ticket.title || ticket.id || "").trim();
  const qty = [];
  if (parseLooseInteger_(line.validatedBoxes) > 0) qty.push(parseLooseInteger_(line.validatedBoxes) + "箱");
  if (parseLooseInteger_(line.validatedPacks) > 0) qty.push(parseLooseInteger_(line.validatedPacks) + "包");
  const lineNote = String(line.note || "").trim();
  return [base, qty.join(" "), lineNote].filter(function(part) { return !!part; }).join(" · ");
}

function computeTicketLinePieces_(line, stockItem) {
  const boxes = Math.max(0, parseLooseInteger_(line.validatedBoxes));
  const packs = Math.max(0, parseLooseInteger_(line.validatedPacks));
  const unitsPerBox = Math.max(0, parseLooseInteger_(stockItem.unitsPerBox));
  const colisage = Math.max(0, parseLooseInteger_(stockItem.colisage));
  if (boxes > 0 && !(unitsPerBox > 0)) throw new Error("件/箱 manquant pour " + stockItem.reference + ".");
  if (packs > 0 && !(colisage > 0)) throw new Error("Colisage manquant pour " + stockItem.reference + ".");
  return (boxes * unitsPerBox) + (packs * colisage);
}

function decomposePiecesToStateModel_(totalPieces, unitsPerBox, colisage, remark) {
  const total = Math.max(0, Math.round(Number(totalPieces || 0)));
  const units = Math.max(0, parseLooseInteger_(unitsPerBox));
  const packSize = Math.max(0, parseLooseInteger_(colisage));
  const base = {
    tail: 0,
    unitsPerBox: units,
    itemBoxes: 0,
    sign: "",
    fractionText: "",
    fractionValue: 0,
    colisage: packSize,
    packNotation: "",
    remark: String(remark || "")
  };
  if (!(total > 0) || !(units > 0)) return base;

  let boxes = Math.floor(total / units);
  let remainder = total - (boxes * units);
  if (remainder === 0) {
    base.itemBoxes = boxes;
    return base;
  }
  if (boxes === 0) {
    base.tail = remainder;
    return base;
  }
  if (packSize > 0 && remainder % packSize === 0) {
    base.itemBoxes = boxes;
    base.packNotation = "+" + (remainder / packSize) + "包";
    return base;
  }
  const fractionPackParts = buildFractionPackMovementParts_(remainder, units, packSize);
  if (fractionPackParts) {
    base.itemBoxes = boxes;
    base.sign = "+";
    base.fractionText = String(fractionPackParts.fractionText || "").replace(/箱$/i, "");
    base.packNotation = "+" + String(fractionPackParts.packsText || "").replace(/包$/i, "") + "包";
    return base;
  }
  const fraction = reduceMovementFraction_(remainder, units);
  if (fraction.num > 0 && fraction.den <= 12) {
    base.itemBoxes = boxes;
    base.sign = "+";
    base.fractionText = fraction.num + "/" + fraction.den;
    return base;
  }
  base.tail = remainder;
  base.itemBoxes = boxes;
  return base;
}

function readTickets_() {
  const ticketSheet = getOrCreateTicketsSheet_();
  const lineSheet = getOrCreateTicketLinesSheet_();
  ensureTicketsHeaders_(ticketSheet);
  ensureTicketLinesHeaders_(lineSheet);
  const ticketRows = readTicketRows_(ticketSheet);
  const lineGroups = readTicketLinesByTicketId_(lineSheet);
  const tickets = ticketRows.map(function(row) {
    return buildTicketFromRows_(row, lineGroups[String(row.id || "")] || []);
  });
  tickets.sort(function(a, b) {
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
  return tickets;
}

function readTicketById_(ticketId) {
  const wanted = String(ticketId || "");
  if (!wanted) return null;
  const tickets = readTickets_();
  for (let i = 0; i < tickets.length; i++) {
    if (tickets[i].id === wanted) return tickets[i];
  }
  return null;
}

function readTicketRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const cols = resolveTicketColumns_(headers);
  const displayRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  const rawRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const rows = [];
  for (let i = 0; i < displayRows.length; i++) {
    const id = String(getRowCell_(displayRows[i], cols.id) || "").trim();
    if (!id) continue;
    rows.push({
      id: id,
      createdAt: historyTimestampRaw_(getRowCell_(rawRows[i], cols.createdAt)),
      updatedAt: historyTimestampRaw_(getRowCell_(rawRows[i], cols.updatedAt)),
      status: String(getRowCell_(displayRows[i], cols.status) || "pending").trim() || "pending",
      title: String(getRowCell_(displayRows[i], cols.title) || "").trim(),
      note: String(getRowCell_(displayRows[i], cols.note) || "").trim(),
      validatedAt: historyTimestampRaw_(getRowCell_(rawRows[i], cols.validatedAt)),
      cancelledAt: historyTimestampRaw_(getRowCell_(rawRows[i], cols.cancelledAt)),
      createdBy: String(getRowCell_(displayRows[i], cols.createdBy) || "").trim(),
      validationMutationId: String(getRowCell_(displayRows[i], cols.validationMutationId) || "").trim()
    });
  }
  return rows;
}

function readTicketLinesByTicketId_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const grouped = {};
  if (lastRow < 2 || lastCol < 1) return grouped;
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const cols = resolveTicketLineColumns_(headers);
  const displayRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  for (let i = 0; i < displayRows.length; i++) {
    const ticketId = String(getRowCell_(displayRows[i], cols.ticketId) || "").trim();
    const lineId = String(getRowCell_(displayRows[i], cols.id) || "").trim();
    if (!ticketId || !lineId) continue;
    if (!grouped[ticketId]) grouped[ticketId] = [];
    grouped[ticketId].push({
      id: lineId,
      reference: String(getRowCell_(displayRows[i], cols.reference) || "").trim(),
      requestedBoxes: parseLooseInteger_(getRowCell_(displayRows[i], cols.requestedBoxes)),
      requestedPacks: parseLooseInteger_(getRowCell_(displayRows[i], cols.requestedPacks)),
      preparedBoxes: parseLooseInteger_(getRowCell_(displayRows[i], cols.preparedBoxes)),
      preparedPacks: parseLooseInteger_(getRowCell_(displayRows[i], cols.preparedPacks)),
      validatedBoxes: parseLooseInteger_(getRowCell_(displayRows[i], cols.validatedBoxes)),
      validatedPacks: parseLooseInteger_(getRowCell_(displayRows[i], cols.validatedPacks)),
      lineStatus: String(getRowCell_(displayRows[i], cols.lineStatus) || "pending").trim() || "pending",
      note: String(getRowCell_(displayRows[i], cols.note) || "").trim()
    });
  }
  return grouped;
}

function buildTicketFromRows_(ticketRow, lineRows) {
  return {
    id: String(ticketRow.id || ""),
    createdAt: String(ticketRow.createdAt || ""),
    updatedAt: String(ticketRow.updatedAt || ticketRow.createdAt || ""),
    status: String(ticketRow.status || "pending"),
    title: String(ticketRow.title || ""),
    note: String(ticketRow.note || ""),
    createdBy: String(ticketRow.createdBy || ""),
    validatedAt: String(ticketRow.validatedAt || ""),
    cancelledAt: String(ticketRow.cancelledAt || ""),
    validationMutationId: String(ticketRow.validationMutationId || ""),
    syncState: "synced",
    lines: Array.isArray(lineRows) ? lineRows : []
  };
}

function normalizeTicketPayload_(ticket) {
  const nextTicket = ticket || {};
  return {
    id: String(nextTicket.id || "").trim(),
    createdAt: historyTimestampRaw_(nextTicket.createdAt || new Date()),
    updatedAt: historyTimestampRaw_(nextTicket.updatedAt || nextTicket.createdAt || new Date()),
    status: String(nextTicket.status || "pending"),
    title: String(nextTicket.title || ""),
    note: String(nextTicket.note || ""),
    validatedAt: historyTimestampRaw_(nextTicket.validatedAt),
    cancelledAt: historyTimestampRaw_(nextTicket.cancelledAt),
    createdBy: String(nextTicket.createdBy || ""),
    validationMutationId: String(nextTicket.validationMutationId || "")
  };
}

function normalizeTicketLinePayload_(line) {
  const nextLine = line || {};
  return {
    id: String(nextLine.id || "").trim(),
    reference: String(nextLine.reference || "").trim(),
    requestedBoxes: Math.max(0, parseLooseInteger_(nextLine.requestedBoxes)),
    requestedPacks: Math.max(0, parseLooseInteger_(nextLine.requestedPacks)),
    preparedBoxes: Math.max(0, parseLooseInteger_(nextLine.preparedBoxes)),
    preparedPacks: Math.max(0, parseLooseInteger_(nextLine.preparedPacks)),
    validatedBoxes: Math.max(0, parseLooseInteger_(nextLine.validatedBoxes)),
    validatedPacks: Math.max(0, parseLooseInteger_(nextLine.validatedPacks)),
    lineStatus: String(nextLine.lineStatus || "pending"),
    note: String(nextLine.note || "")
  };
}

function getOrCreateTicketsSheet_() {
  const existing = getOptionalSheet_(SZFASHION_TICKETS_SHEET);
  if (existing) {
    ensureTicketsHeaders_(existing);
    return existing;
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SZFASHION_TICKETS_SHEET);
  ensureTicketsHeaders_(sheet);
  return sheet;
}

function getOrCreateTicketLinesSheet_() {
  const existing = getOptionalSheet_(SZFASHION_TICKET_LINES_SHEET);
  if (existing) {
    ensureTicketLinesHeaders_(existing);
    return existing;
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SZFASHION_TICKET_LINES_SHEET);
  ensureTicketLinesHeaders_(sheet);
  return sheet;
}

function ensureTicketsHeaders_(sheet) {
  const headers = ["id", "created_at", "updated_at", "status", "title", "note", "validated_at", "cancelled_at", "created_by", "validation_mutation_id"];
  ensureSheetHeaders_(sheet, headers, ["id"]);
}

function ensureTicketLinesHeaders_(sheet) {
  const headers = ["id", "ticket_id", "reference", "requested_boxes", "requested_packs", "prepared_boxes", "prepared_packs", "validated_boxes", "validated_packs", "line_status", "note", "updated_at"];
  ensureSheetHeaders_(sheet, headers, ["id", "ticket_id", "reference"]);
}

function ensureSheetHeaders_(sheet, headers, textColumns) {
  const lastCol = sheet.getLastColumn();
  const firstRow = lastCol > 0 ? sheet.getRange(1, 1, 1, Math.max(lastCol, headers.length)).getDisplayValues()[0] : [];
  const normalizedFirst = firstRow.map(normalizeHeader_);
  const matches = headers.every(function(header, index) {
    return normalizedFirst[index] === normalizeHeader_(header);
  });
  if (!matches) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  (Array.isArray(textColumns) ? textColumns : []).forEach(function(header) {
    const index = headers.indexOf(header);
    if (index >= 0) sheet.getRange(1, index + 1, Math.max(sheet.getMaxRows(), 1), 1).setNumberFormat("@");
  });
}

function resolveTicketColumns_(headers) {
  return {
    id: findColumn_(headers, ["id"]),
    createdAt: findColumn_(headers, ["created_at"]),
    updatedAt: findColumn_(headers, ["updated_at"]),
    status: findColumn_(headers, ["status"]),
    title: findColumn_(headers, ["title"]),
    note: findColumn_(headers, ["note"]),
    validatedAt: findColumn_(headers, ["validated_at"]),
    cancelledAt: findColumn_(headers, ["cancelled_at"]),
    createdBy: findColumn_(headers, ["created_by"]),
    validationMutationId: findColumn_(headers, ["validation_mutation_id"])
  };
}

function resolveTicketLineColumns_(headers) {
  return {
    id: findColumn_(headers, ["id"]),
    ticketId: findColumn_(headers, ["ticket_id"]),
    reference: findColumn_(headers, ["reference"]),
    requestedBoxes: findColumn_(headers, ["requested_boxes"]),
    requestedPacks: findColumn_(headers, ["requested_packs"]),
    preparedBoxes: findColumn_(headers, ["prepared_boxes"]),
    preparedPacks: findColumn_(headers, ["prepared_packs"]),
    validatedBoxes: findColumn_(headers, ["validated_boxes"]),
    validatedPacks: findColumn_(headers, ["validated_packs"]),
    lineStatus: findColumn_(headers, ["line_status"]),
    note: findColumn_(headers, ["note"]),
    updatedAt: findColumn_(headers, ["updated_at"])
  };
}

function appendTicketRow_(sheet, ticket) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const cols = resolveTicketColumns_(headers);
  const row = [];
  row[cols.id] = ticket.id;
  row[cols.createdAt] = ticket.createdAt ? new Date(ticket.createdAt) : new Date();
  row[cols.updatedAt] = ticket.updatedAt ? new Date(ticket.updatedAt) : new Date();
  row[cols.status] = ticket.status;
  row[cols.title] = ticket.title;
  row[cols.note] = ticket.note;
  row[cols.validatedAt] = ticket.validatedAt ? new Date(ticket.validatedAt) : "";
  row[cols.cancelledAt] = ticket.cancelledAt ? new Date(ticket.cancelledAt) : "";
  row[cols.createdBy] = ticket.createdBy;
  row[cols.validationMutationId] = ticket.validationMutationId;
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function appendTicketLineRow_(sheet, ticketId, line) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const cols = resolveTicketLineColumns_(headers);
  const row = [];
  row[cols.id] = line.id;
  row[cols.ticketId] = ticketId;
  row[cols.reference] = line.reference;
  row[cols.requestedBoxes] = line.requestedBoxes;
  row[cols.requestedPacks] = line.requestedPacks;
  row[cols.preparedBoxes] = line.preparedBoxes;
  row[cols.preparedPacks] = line.preparedPacks;
  row[cols.validatedBoxes] = line.validatedBoxes;
  row[cols.validatedPacks] = line.validatedPacks;
  row[cols.lineStatus] = line.lineStatus;
  row[cols.note] = line.note;
  row[cols.updatedAt] = new Date();
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function findTicketRowIndexById_(sheet, ticketId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const cols = resolveTicketColumns_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]);
  const values = sheet.getRange(2, cols.id + 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || "").trim() === String(ticketId || "").trim()) return i + 2;
  }
  return -1;
}

function findTicketLineRowIndexById_(sheet, lineId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const cols = resolveTicketLineColumns_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]);
  const values = sheet.getRange(2, cols.id + 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || "").trim() === String(lineId || "").trim()) return i + 2;
  }
  return -1;
}

function touchTicketUpdatedAt_(sheet, ticketId) {
  const rowIndex = findTicketRowIndexById_(sheet, ticketId);
  if (rowIndex < 2) return;
  const cols = resolveTicketColumns_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]);
  writeCellIfPresent_(sheet, rowIndex, cols.updatedAt, new Date());
}
