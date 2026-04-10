const SZFASHION_STOCK_SHEET = "STOCK";
const SZFASHION_HISTORY_SHEET = "STOCK_HISTORY";
const SZFASHION_ARRIVALS_SHEET = "ARRIVAGES_DB";
const SZFASHION_REFERENCE_IMPORT_BATCHES_SHEET = "REFERENCE_IMPORT_BATCHES";
const SZFASHION_REFERENCE_IMPORT_LINES_SHEET = "REFERENCE_IMPORT_LINES";
const SZFASHION_PICKUP_TICKETS_SHEET = "PICKUP_TICKETS";
const SZFASHION_PICKUP_TICKET_LINES_SHEET = "PICKUP_TICKET_LINES";
const SZFASHION_PICKUP_TICKET_EVENTS_SHEET = "PICKUP_TICKET_EVENTS";

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

function getReferenceImportBatchesPayload_() {
  const sheet = getOptionalSheet_(SZFASHION_REFERENCE_IMPORT_BATCHES_SHEET);
  const items = sheet ? readReferenceImportBatches_(sheet) : [];
  return {
    items: items,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function getReferenceImportBatchPayload_(batchId) {
  const normalizedBatchId = String(batchId || "").trim();
  const batchSheet = getOptionalSheet_(SZFASHION_REFERENCE_IMPORT_BATCHES_SHEET);
  const lineSheet = getOptionalSheet_(SZFASHION_REFERENCE_IMPORT_LINES_SHEET);
  const batches = batchSheet ? readReferenceImportBatches_(batchSheet) : [];
  const batch = batches.find(function(entry) {
    return String(entry.batchId || "") === normalizedBatchId;
  }) || null;
  const lines = lineSheet ? readReferenceImportLines_(lineSheet, normalizedBatchId) : [];
  return {
    batch: batch,
    lines: lines,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function getPickupTicketsPayload_() {
  const ticketSheet = getOptionalSheet_(SZFASHION_PICKUP_TICKETS_SHEET);
  const items = ticketSheet ? readPickupTickets_(ticketSheet) : [];
  return {
    items: items,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function getPickupTicketsBootstrapPayload_() {
  const generatedAt = new Date().toISOString();
  const ticketSheet = getOptionalSheet_(SZFASHION_PICKUP_TICKETS_SHEET);
  const lineSheet = getOptionalSheet_(SZFASHION_PICKUP_TICKET_LINES_SHEET);
  const eventSheet = getOptionalSheet_(SZFASHION_PICKUP_TICKET_EVENTS_SHEET);
  const items = ticketSheet ? readPickupTickets_(ticketSheet) : [];
  const inventoryByReference = buildInventoryLookupByReference_();
  const lines = lineSheet ? enrichPickupTicketLinesWithStock_(readPickupTicketLines_(lineSheet, ""), inventoryByReference) : [];
  const events = eventSheet ? readPickupTicketEvents_(eventSheet, "") : [];
  const linesByTicketId = {};
  const eventsByTicketId = {};
  lines.forEach(function(line) {
    const ticketId = String(line.ticketId || "").trim();
    if (!ticketId) return;
    if (!linesByTicketId[ticketId]) linesByTicketId[ticketId] = [];
    linesByTicketId[ticketId].push(line);
  });
  events.forEach(function(event) {
    const ticketId = String(event.ticketId || "").trim();
    if (!ticketId) return;
    if (!eventsByTicketId[ticketId]) eventsByTicketId[ticketId] = [];
    eventsByTicketId[ticketId].push(event);
  });
  const detailsById = {};
  items.forEach(function(ticket) {
    const ticketId = String(ticket.ticketId || "").trim();
    if (!ticketId) return;
    detailsById[ticketId] = {
      ticket: ticket,
      lines: Array.isArray(linesByTicketId[ticketId]) ? linesByTicketId[ticketId] : [],
      events: Array.isArray(eventsByTicketId[ticketId]) ? eventsByTicketId[ticketId] : []
    };
  });
  return {
    items: items,
    detailsById: detailsById,
    generatedAt: generatedAt,
    source: "google_sheets"
  };
}

function getPickupTicketPayload_(ticketId) {
  const normalizedTicketId = String(ticketId || "").trim();
  const ticketSheet = getOptionalSheet_(SZFASHION_PICKUP_TICKETS_SHEET);
  const lineSheet = getOptionalSheet_(SZFASHION_PICKUP_TICKET_LINES_SHEET);
  const eventSheet = getOptionalSheet_(SZFASHION_PICKUP_TICKET_EVENTS_SHEET);
  const inventoryByReference = buildInventoryLookupByReference_();
  const ticket = ticketSheet ? readPickupTickets_(ticketSheet).find(function(entry) {
    return String(entry.ticketId || "") === normalizedTicketId;
  }) : null;
  return {
    ticket: ticket || null,
    lines: lineSheet ? enrichPickupTicketLinesWithStock_(readPickupTicketLines_(lineSheet, normalizedTicketId), inventoryByReference) : [],
    events: eventSheet ? readPickupTicketEvents_(eventSheet, normalizedTicketId) : [],
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function buildInventoryLookupByReference_() {
  const sheet = getOptionalSheet_(SZFASHION_STOCK_SHEET);
  if (!sheet) return {};
  const items = enrichInventoryItemsWithArrivalDates_(readInventoryItems_(sheet), readArrivalsUpdatedAtLookup_());
  const lookup = {};
  items.forEach(function(item) {
    const reference = normalizeReference_(item && item.reference);
    if (!reference) return;
    lookup[reference] = item;
  });
  return lookup;
}

function enrichPickupTicketLinesWithStock_(lines, inventoryByReference) {
  const lookup = inventoryByReference || {};
  return (Array.isArray(lines) ? lines : []).map(function(line) {
    const reference = normalizeReference_(line && line.reference);
    const item = reference ? lookup[reference] : null;
    return Object.assign({}, line, {
      stockAvailablePiecesSnapshot: line && line.stockAvailablePiecesSnapshot != null
        ? line.stockAvailablePiecesSnapshot
        : (item ? stateModelToPieces_(item) : null),
      stockAvailableDisplaySnapshot: item ? String(item.stockDisplay || "").trim() : ""
    });
  });
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
    arrivalUpdatedAtSort: 0,
    completionStatus: computeReferenceCompletionStatus_({
      arrivalNote: arrivalNote,
      tail: tail,
      unitsPerBox: unitsPerBox,
      itemBoxes: itemBoxes,
      fractionText: fractionText,
      packNotation: packNotation
    })
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
      arrivalWarehouse: String(arrival.warehouse || ""),
      completionStatus: computeReferenceCompletionStatus_(Object.assign({}, item, {
        arrivalNote: String(arrival.arrivalId || item.arrivalNote || "")
      }))
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
    movementDisplay: String(getRowCell_(displayRow, cols.movementDisplay) || "").trim(),
    businessId: String(getRowCell_(displayRow, cols.businessId) || "").trim(),
    businessLineId: String(getRowCell_(displayRow, cols.businessLineId) || "").trim()
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
    movementDisplay: findColumn_(headers, ["movement_display"]),
    businessId: findColumn_(headers, ["business_id"]),
    businessLineId: findColumn_(headers, ["business_line_id"])
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
  if (mutation.type === "create_reference_manual") return applyCreateReferenceManualMutation_(mutation);
  if (mutation.type === "create_reference_import_batch_from_file") return applyCreateReferenceImportBatchFromFileMutation_(mutation);
  if (mutation.type === "finalize_reference_import_batch") return applyFinalizeReferenceImportBatchMutation_(mutation);
  if (mutation.type === "create_pickup_ticket") return applyCreatePickupTicketMutation_(mutation);
  if (mutation.type === "resolve_pickup_ticket_line") return applyResolvePickupTicketLineMutation_(mutation);
  if (mutation.type === "validate_pickup_ticket") return applyValidatePickupTicketMutation_(mutation);
  if (mutation.type === "cancel_pickup_ticket") return applyCancelPickupTicketMutation_(mutation);
  throw new Error("Mutation non supportée.");
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
  const request = mutation && mutation.request ? mutation.request : {};
  const actionType = normalizeHistoryActionType_(mutation.actionType || (mutation.request && mutation.request.localActionType) || "adjustment") || "adjustment";
  const remark = String(request.remark || "").trim();
  const referenceText = String(afterItem.reference || "").trim();
  const beforeTimestampRaw = findLatestHistoryTimestampForReference_(sheet, cols, referenceText);
  const beforeTotalPieces = Number(stateModelToPieces_(beforeItem) || 0);
  const afterTotalPieces = Number(stateModelToPieces_(afterItem) || 0);
  const businessId = String(request.businessId || "").trim();
  const businessLineId = String(request.businessLineId || "").trim();
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
  if (cols.businessId >= 0) {
    row[cols.businessId] = businessId;
  }
  if (cols.businessLineId >= 0) {
    row[cols.businessLineId] = businessLineId;
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
    movementDisplay: movementDisplay,
    businessId: businessId,
    businessLineId: businessLineId
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
    "movement_display",
    "business_id",
    "business_line_id"
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

function computeReferenceCompletionStatus_(item) {
  const arrivalNote = String(item && item.arrivalNote || "").trim();
  if (arrivalNote) return "complete";
  const hasStockInfo = Math.max(0, parseLooseInteger_(item && item.tail)) > 0
    || Math.max(0, parseLooseInteger_(item && item.unitsPerBox)) > 0
    || Math.max(0, parseLooseInteger_(item && item.itemBoxes)) > 0
    || !!normalizeFractionText_(item && item.fractionText)
    || !!normalizePackNotation_(item && item.packNotation);
  return hasStockInfo ? "complete" : "incomplete";
}

function getOrCreateSheetWithHeaders_(sheetName, headers) {
  const existing = getOptionalSheet_(sheetName);
  if (existing) {
    ensureSheetHeaders_(existing, headers);
    return existing;
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
  ensureSheetHeaders_(sheet, headers);
  return sheet;
}

function ensureSheetHeaders_(sheet, headers) {
  const list = Array.isArray(headers) ? headers.slice() : [];
  const lastCol = sheet.getLastColumn();
  const current = lastCol > 0 ? sheet.getRange(1, 1, 1, Math.max(lastCol, list.length)).getDisplayValues()[0] : [];
  const normalizedCurrent = current.map(normalizeHeader_);
  const matches = list.every(function(header, index) {
    return normalizedCurrent[index] === normalizeHeader_(header);
  });
  if (!matches) {
    sheet.getRange(1, 1, 1, list.length).setValues([list]);
  }
}

function getOrCreateReferenceImportBatchesSheet_() {
  return getOrCreateSheetWithHeaders_(SZFASHION_REFERENCE_IMPORT_BATCHES_SHEET, [
    "batch_id",
    "created_at",
    "created_by",
    "status",
    "source_file_name",
    "source_file_type",
    "source_file_drive_id",
    "source_file_url",
    "source_sheet_name",
    "mapping_json",
    "total_rows",
    "valid_rows",
    "invalid_rows",
    "duplicate_rows",
    "notes"
  ]);
}

function getOrCreateReferenceImportLinesSheet_() {
  return getOrCreateSheetWithHeaders_(SZFASHION_REFERENCE_IMPORT_LINES_SHEET, [
    "line_id",
    "batch_id",
    "line_number",
    "status",
    "duplicate_status",
    "raw_row_json",
    "mapped_reference",
    "mapped_warehouse",
    "mapped_arrival_note",
    "mapped_remark",
    "mapped_tail",
    "mapped_units_per_box",
    "mapped_boxes",
    "mapped_sign",
    "mapped_fraction",
    "mapped_pack_notation",
    "validation_errors_json",
    "resolution_action",
    "resolved_reference",
    "created_reference",
    "created_at",
    "updated_at"
  ]);
}

function getOrCreatePickupTicketsSheet_() {
  return getOrCreateSheetWithHeaders_(SZFASHION_PICKUP_TICKETS_SHEET, [
    "ticket_id",
    "ticket_number",
    "status",
    "created_at",
    "created_by",
    "updated_at",
    "validated_at",
    "validated_by",
    "title",
    "request_text_raw",
    "global_note",
    "line_count",
    "resolved_line_count",
    "blocked_line_count",
    "version"
  ]);
}

function getOrCreatePickupTicketLinesSheet_() {
  return getOrCreateSheetWithHeaders_(SZFASHION_PICKUP_TICKET_LINES_SHEET, [
    "line_id",
    "ticket_id",
    "line_number",
    "reference",
    "status",
    "request_unit",
    "request_quantity",
    "requested_display",
    "picked_unit",
    "picked_quantity",
    "picked_display",
    "stock_available_pieces_snapshot",
    "warehouse_help_display",
    "arrival_note_snapshot",
    "line_note",
    "stock_mutation_id",
    "created_at",
    "updated_at"
  ]);
}

function getOrCreatePickupTicketEventsSheet_() {
  return getOrCreateSheetWithHeaders_(SZFASHION_PICKUP_TICKET_EVENTS_SHEET, [
    "event_id",
    "ticket_id",
    "line_id",
    "event_type",
    "actor",
    "created_at",
    "payload_json",
    "message"
  ]);
}

function readSheetObjects_(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  return rows.map(function(row, index) {
    const object = { _rowIndex: index + 2 };
    headers.forEach(function(header, headerIndex) {
      object[String(header || "").trim()] = getRowCell_(row, headerIndex);
    });
    return object;
  });
}

function readReferenceImportBatches_(sheet) {
  return readSheetObjects_(sheet).map(function(row) {
    return {
      batchId: String(row.batch_id || "").trim(),
      createdAt: String(row.created_at || "").trim(),
      createdBy: String(row.created_by || "").trim(),
      status: String(row.status || "").trim(),
      sourceFileName: String(row.source_file_name || "").trim(),
      sourceFileType: String(row.source_file_type || "").trim(),
      sourceFileDriveId: String(row.source_file_drive_id || "").trim(),
      sourceFileUrl: String(row.source_file_url || "").trim(),
      sourceSheetName: String(row.source_sheet_name || "").trim(),
      mapping: parseJsonSafely_(row.mapping_json, {}),
      totals: {
        totalRows: Number(row.total_rows || 0),
        validRows: Number(row.valid_rows || 0),
        invalidRows: Number(row.invalid_rows || 0),
        duplicateRows: Number(row.duplicate_rows || 0)
      },
      notes: String(row.notes || "").trim()
    };
  }).sort(function(a, b) {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function readReferenceImportLines_(sheet, batchId) {
  const normalizedBatchId = String(batchId || "").trim();
  return readSheetObjects_(sheet).filter(function(row) {
    return !normalizedBatchId || String(row.batch_id || "").trim() === normalizedBatchId;
  }).map(function(row) {
    return {
      lineId: String(row.line_id || "").trim(),
      batchId: String(row.batch_id || "").trim(),
      lineNumber: Number(row.line_number || 0),
      status: String(row.status || "").trim(),
      duplicateStatus: String(row.duplicate_status || "").trim(),
      rawRow: parseJsonSafely_(row.raw_row_json, {}),
      mapped: {
        reference: String(row.mapped_reference || "").trim(),
        warehouse: String(row.mapped_warehouse || "").trim(),
        arrivalNote: String(row.mapped_arrival_note || "").trim(),
        remark: String(row.mapped_remark || "").trim(),
        tail: String(row.mapped_tail || "").trim(),
        unitsPerBox: String(row.mapped_units_per_box || "").trim(),
        boxes: String(row.mapped_boxes || "").trim(),
        sign: String(row.mapped_sign || "").trim(),
        fractionText: String(row.mapped_fraction || "").trim(),
        packNotation: String(row.mapped_pack_notation || "").trim()
      },
      validationErrors: parseJsonSafely_(row.validation_errors_json, []),
      resolutionAction: String(row.resolution_action || "").trim(),
      resolvedReference: String(row.resolved_reference || "").trim(),
      createdReference: String(row.created_reference || "").trim()
    };
  }).sort(function(a, b) {
    return Number(a.lineNumber || 0) - Number(b.lineNumber || 0);
  });
}

function readPickupTickets_(sheet) {
  return readSheetObjects_(sheet).map(function(row) {
    return {
      ticketId: String(row.ticket_id || "").trim(),
      ticketNumber: String(row.ticket_number || "").trim(),
      status: String(row.status || "").trim(),
      createdAt: String(row.created_at || "").trim(),
      createdBy: String(row.created_by || "").trim(),
      updatedAt: String(row.updated_at || "").trim(),
      validatedAt: String(row.validated_at || "").trim(),
      validatedBy: String(row.validated_by || "").trim(),
      title: String(row.title || "").trim(),
      requestTextRaw: String(row.request_text_raw || "").trim(),
      globalNote: String(row.global_note || "").trim(),
      lineCount: Number(row.line_count || 0),
      resolvedLineCount: Number(row.resolved_line_count || 0),
      blockedLineCount: Number(row.blocked_line_count || 0),
      version: Number(row.version || 0),
      _rowIndex: row._rowIndex
    };
  }).sort(function(a, b) {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function readPickupTicketLines_(sheet, ticketId) {
  const normalizedTicketId = String(ticketId || "").trim();
  return readSheetObjects_(sheet).filter(function(row) {
    return !normalizedTicketId || String(row.ticket_id || "").trim() === normalizedTicketId;
  }).map(function(row) {
    return {
      lineId: String(row.line_id || "").trim(),
      ticketId: String(row.ticket_id || "").trim(),
      lineNumber: Number(row.line_number || 0),
      reference: normalizeReference_(row.reference),
      status: String(row.status || "").trim(),
      requestUnit: String(row.request_unit || "").trim(),
      requestQuantity: parseNullableNumber_(row.request_quantity),
      requestedDisplay: String(row.requested_display || "").trim(),
      pickedUnit: String(row.picked_unit || "").trim(),
      pickedQuantity: parseNullableNumber_(row.picked_quantity),
      pickedDisplay: String(row.picked_display || "").trim(),
      stockAvailablePiecesSnapshot: parseNullableNumber_(row.stock_available_pieces_snapshot),
      warehouseHelpDisplay: String(row.warehouse_help_display || "").trim(),
      arrivalNoteSnapshot: String(row.arrival_note_snapshot || "").trim(),
      lineNote: String(row.line_note || "").trim(),
      stockMutationId: String(row.stock_mutation_id || "").trim(),
      createdAt: String(row.created_at || "").trim(),
      updatedAt: String(row.updated_at || "").trim(),
      _rowIndex: row._rowIndex
    };
  }).sort(function(a, b) {
    return Number(a.lineNumber || 0) - Number(b.lineNumber || 0);
  });
}

function readPickupTicketEvents_(sheet, ticketId) {
  const normalizedTicketId = String(ticketId || "").trim();
  return readSheetObjects_(sheet).filter(function(row) {
    return !normalizedTicketId || String(row.ticket_id || "").trim() === normalizedTicketId;
  }).map(function(row) {
    return {
      eventId: String(row.event_id || "").trim(),
      ticketId: String(row.ticket_id || "").trim(),
      lineId: String(row.line_id || "").trim(),
      eventType: String(row.event_type || "").trim(),
      actor: String(row.actor || "").trim(),
      createdAt: String(row.created_at || "").trim(),
      payload: parseJsonSafely_(row.payload_json, {}),
      message: String(row.message || "").trim()
    };
  }).sort(function(a, b) {
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}

function parseJsonSafely_(value, fallback) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return fallback;
  }
}

function parseNullableNumber_(value) {
  if (value === null || typeof value === "undefined" || value === "") return null;
  const numberValue = Number(value);
  return isFinite(numberValue) ? numberValue : null;
}

function buildGeneratedId_(prefix) {
  return String(prefix || "id") + "_" + Utilities.getUuid().replace(/-/g, "").slice(0, 12);
}

function applyCreateReferenceManualMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : null;
  if (!request) throw new Error("Payload création référence manquant.");
  const created = createReferenceInStock_(request, {
    mutationId: String(mutation.id || ""),
    actionType: "adjustment"
  });
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    item: created.item,
    historyEntry: created.historyEntry || null,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function createReferenceInStock_(request, options) {
  const reference = normalizeReference_(request && request.reference);
  if (!reference) throw new Error("Référence obligatoire.");
  if (findInventoryItemByReference_(reference)) throw new Error("Cette référence existe déjà.");

  const sheet = getRequiredSheet_(SZFASHION_STOCK_SHEET);
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const cols = resolveInventoryColumns_(headers);
  if (cols.reference < 0) throw new Error("Colonne référence introuvable dans STOCK.");

  const nextRowIndex = sheet.getLastRow() + 1;
  if (sheet.getMaxColumns() < lastCol) sheet.insertColumnsAfter(sheet.getMaxColumns(), lastCol - sheet.getMaxColumns());
  sheet.getRange(nextRowIndex, 1, 1, lastCol).clearContent();
  writeCellIfPresent_(sheet, nextRowIndex, cols.reference, reference);
  writeCellIfPresent_(sheet, nextRowIndex, cols.sortKey, reference);
  writeCellIfPresent_(sheet, nextRowIndex, cols.warehouse, String(request.warehouse || "").trim());
  writeCellIfPresent_(sheet, nextRowIndex, cols.arrivalNote, String(request.arrivalNote || "").trim());
  writeCellIfPresent_(sheet, nextRowIndex, cols.remark, String(request.remark || "").trim());

  const initialStock = request.initialStock || {};
  writeCellIfPresent_(sheet, nextRowIndex, cols.tailRaw, Math.max(0, parseLooseInteger_(initialStock.tail)));
  writeCellIfPresent_(sheet, nextRowIndex, cols.unitsPerBoxRaw, Math.max(0, parseLooseInteger_(initialStock.unitsPerBox)));
  writeCellIfPresent_(sheet, nextRowIndex, cols.boxesRaw, Math.max(0, parseLooseInteger_(initialStock.boxes)));
  writeCellIfPresent_(sheet, nextRowIndex, cols.signRaw, normalizeSign_(initialStock.sign));
  writeCellIfPresent_(sheet, nextRowIndex, cols.fractionRaw, normalizeFractionText_(initialStock.fractionText));
  writeCellIfPresent_(sheet, nextRowIndex, cols.packNotation, normalizePackNotation_(initialStock.packNotation));
  writeCellIfPresent_(sheet, nextRowIndex, cols.createdAt, new Date());

  const displayRow = sheet.getRange(nextRowIndex, 1, 1, lastCol).getDisplayValues()[0];
  const item = buildInventoryItem_(displayRow, cols, nextRowIndex);
  if (!item) throw new Error("Impossible de relire la référence créée.");

  let historyEntry = null;
  if (stateModelToPieces_(item) > 0) {
    historyEntry = appendHistoryForMutation_({
      actionType: options && options.actionType ? options.actionType : "adjustment",
      request: {
        remark: "Création référence",
        businessId: String(options && options.mutationId || ""),
        businessLineId: reference
      }
    }, buildEmptyStateForItem_(item), item);
  }

  return { item: item, historyEntry: historyEntry };
}

function buildEmptyStateForItem_(item) {
  return {
    id: String(item && item.id || ""),
    reference: String(item && item.reference || ""),
    tail: 0,
    unitsPerBox: Math.max(0, parseLooseInteger_(item && item.unitsPerBox)),
    itemBoxes: 0,
    sign: "",
    fractionText: "",
    fractionValue: 0,
    colisage: Math.max(0, parseLooseInteger_(item && item.colisage)),
    packNotation: "",
    stockDisplay: "-",
    remark: String(item && item.remark || "").trim()
  };
}

function applyCreateReferenceImportBatchFromFileMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : null;
  if (!request) throw new Error("Payload import références manquant.");
  const batchesSheet = getOrCreateReferenceImportBatchesSheet_();
  const linesSheet = getOrCreateReferenceImportLinesSheet_();
  const sourceInfo = storeUploadedImportSource_(request);
  const extracted = extractImportedReferenceRows_(sourceInfo.sheetId, request.sourceSheetName);
  const mapping = request.mapping || {};
  const rows = mapImportedReferenceRows_(extracted.headers, extracted.rows, mapping);
  const batchId = buildGeneratedId_("imp");
  const createdAt = new Date().toISOString();
  const duplicateLookup = buildExistingReferenceLookup_();
  const lineRecords = rows.map(function(row, index) {
    const mappedReference = normalizeReference_(row.mapped.reference);
    const errors = [];
    let status = "valid";
    let duplicateStatus = "none";
    if (!mappedReference) {
      status = "invalid";
      errors.push("Référence manquante.");
    } else if (duplicateLookup[mappedReference]) {
      status = "duplicate";
      duplicateStatus = "existing_reference";
      errors.push("Référence déjà existante.");
    }
    return {
      lineId: buildGeneratedId_("impl"),
      batchId: batchId,
      lineNumber: index + 2,
      status: status,
      duplicateStatus: duplicateStatus,
      rawRow: row.raw,
      mapped: row.mapped,
      validationErrors: errors
    };
  });

  const totals = {
    totalRows: lineRecords.length,
    validRows: lineRecords.filter(function(line) { return line.status === "valid"; }).length,
    invalidRows: lineRecords.filter(function(line) { return line.status === "invalid"; }).length,
    duplicateRows: lineRecords.filter(function(line) { return line.status === "duplicate"; }).length
  };

  batchesSheet.appendRow([
    batchId,
    createdAt,
    String(request.createdBy || "").trim(),
    "review",
    String(request.sourceFileName || "").trim(),
    String(request.sourceFileType || "").trim(),
    String(sourceInfo.sourceFileId || "").trim(),
    String(sourceInfo.sourceFileUrl || "").trim(),
    String(sourceInfo.sheetName || "").trim(),
    JSON.stringify(mapping || {}),
    totals.totalRows,
    totals.validRows,
    totals.invalidRows,
    totals.duplicateRows,
    ""
  ]);

  if (lineRecords.length) {
    linesSheet.getRange(linesSheet.getLastRow() + 1, 1, lineRecords.length, 22).setValues(lineRecords.map(function(line) {
      return [
        line.lineId,
        line.batchId,
        line.lineNumber,
        line.status,
        line.duplicateStatus,
        JSON.stringify(line.rawRow || {}),
        String(line.mapped.reference || "").trim(),
        String(line.mapped.warehouse || "").trim(),
        String(line.mapped.arrivalNote || "").trim(),
        String(line.mapped.remark || "").trim(),
        String(line.mapped.tail || "").trim(),
        String(line.mapped.unitsPerBox || "").trim(),
        String(line.mapped.boxes || "").trim(),
        String(line.mapped.sign || "").trim(),
        String(line.mapped.fractionText || "").trim(),
        String(line.mapped.packNotation || "").trim(),
        JSON.stringify(line.validationErrors || []),
        "",
        "",
        "",
        createdAt,
        createdAt
      ];
    }));
  }

  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    batch: getReferenceImportBatchPayload_(batchId).batch,
    lines: getReferenceImportBatchPayload_(batchId).lines,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function buildExistingReferenceLookup_() {
  const sheet = getOptionalSheet_(SZFASHION_STOCK_SHEET);
  if (!sheet) return {};
  return readInventoryItems_(sheet).reduce(function(map, item) {
    map[normalizeReference_(item.reference)] = true;
    return map;
  }, {});
}

function storeUploadedImportSource_(request) {
  const fileBase64 = String(request.fileBase64 || "").trim();
  const fileName = String(request.sourceFileName || "import").trim();
  const fileType = resolveUploadedFileMimeType_(request);
  if (!fileBase64) throw new Error("Fichier import manquant.");

  const blob = Utilities.newBlob(Utilities.base64Decode(fileBase64), fileType, fileName);
  const sourceFile = DriveApp.createFile(blob);
  let convertedFile = null;
  try {
    convertedFile = Drive.Files.create({
      name: fileName.replace(/\.[^.]+$/, "") + " (import)",
      mimeType: "application/vnd.google-apps.spreadsheet"
    }, blob, { supportsAllDrives: true });
  } catch (error) {
    throw new Error("Impossible de convertir le fichier importé en Google Sheet : " + (error && error.message ? error.message : error));
  }
  return {
    sourceFileId: sourceFile.getId(),
    sourceFileUrl: sourceFile.getUrl(),
    sheetId: convertedFile && convertedFile.id ? convertedFile.id : "",
    sheetName: String(request.sourceSheetName || "").trim()
  };
}

function resolveUploadedFileMimeType_(request) {
  const explicitMime = String(request && request.mimeType || "").trim();
  if (explicitMime) return explicitMime;
  const type = String(request && request.sourceFileType || "").trim().toLowerCase();
  if (type === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (type === "xls") return "application/vnd.ms-excel";
  if (type === "ods") return "application/vnd.oasis.opendocument.spreadsheet";
  return "application/octet-stream";
}

function extractImportedReferenceRows_(spreadsheetId, preferredSheetName) {
  if (!spreadsheetId) throw new Error("Fichier converti introuvable.");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheets = spreadsheet.getSheets();
  if (!sheets.length) throw new Error("Aucune feuille trouvée dans le document importé.");
  let sheet = null;
  const preferred = String(preferredSheetName || "").trim();
  if (preferred) {
    sheet = spreadsheet.getSheetByName(preferred);
  }
  if (!sheet) sheet = sheets[0];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) throw new Error("Le document importé est vide.");
  const values = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  return {
    sheetName: sheet.getName(),
    headers: values[0],
    rows: values.slice(1)
  };
}

function mapImportedReferenceRows_(headers, rows, mapping) {
  const headerIndexByName = {};
  (Array.isArray(headers) ? headers : []).forEach(function(header, index) {
    headerIndexByName[String(header || "").trim()] = index;
  });
  function readMappedCell_(row, mappingKey) {
    const mappedHeader = mapping && mapping[mappingKey] ? String(mapping[mappingKey]).trim() : "";
    if (!mappedHeader && mappedHeader !== "") return "";
    const index = Object.prototype.hasOwnProperty.call(headerIndexByName, mappedHeader) ? headerIndexByName[mappedHeader] : -1;
    return index >= 0 ? String(getRowCell_(row, index) || "").trim() : "";
  }
  return (Array.isArray(rows) ? rows : []).map(function(row) {
    const raw = {};
    (Array.isArray(headers) ? headers : []).forEach(function(header, index) {
      raw[String(header || "").trim()] = String(getRowCell_(row, index) || "").trim();
    });
    return {
      raw: raw,
      mapped: {
        reference: readMappedCell_(row, "reference"),
        warehouse: readMappedCell_(row, "warehouse"),
        arrivalNote: readMappedCell_(row, "arrivalNote"),
        remark: readMappedCell_(row, "remark"),
        tail: readMappedCell_(row, "tail"),
        unitsPerBox: readMappedCell_(row, "unitsPerBox"),
        boxes: readMappedCell_(row, "boxes"),
        sign: readMappedCell_(row, "sign"),
        fractionText: readMappedCell_(row, "fractionText"),
        packNotation: readMappedCell_(row, "packNotation")
      }
    };
  });
}

function applyFinalizeReferenceImportBatchMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : null;
  if (!request) throw new Error("Payload finalisation import manquant.");
  const batchId = String(request.batchId || "").trim();
  if (!batchId) throw new Error("batchId manquant.");
  const batchesSheet = getOrCreateReferenceImportBatchesSheet_();
  const linesSheet = getOrCreateReferenceImportLinesSheet_();
  const lines = readReferenceImportLines_(linesSheet, batchId);
  const lineResolutions = {};
  (Array.isArray(request.lineResolutions) ? request.lineResolutions : []).forEach(function(entry) {
    if (entry && entry.lineId) lineResolutions[String(entry.lineId)] = entry;
  });
  const nowIso = new Date().toISOString();
  const lineRows = readSheetObjects_(linesSheet);
  lines.forEach(function(line) {
    const resolution = lineResolutions[line.lineId] || null;
    if (!resolution) return;
    const row = lineRows.find(function(entry) { return String(entry.line_id || "") === line.lineId; });
    if (!row) return;
    const rowIndex = row._rowIndex;
    let nextStatus = line.status;
    let createdReference = "";
    if (resolution.action === "create") {
      const created = createReferenceInStock_({
        reference: line.mapped.reference,
        warehouse: line.mapped.warehouse,
        arrivalNote: line.mapped.arrivalNote,
        remark: line.mapped.remark,
        initialStock: {
          tail: line.mapped.tail,
          unitsPerBox: line.mapped.unitsPerBox,
          boxes: line.mapped.boxes,
          sign: line.mapped.sign,
          fractionText: line.mapped.fractionText,
          packNotation: line.mapped.packNotation
        }
      }, {
        mutationId: String(mutation.id || ""),
        actionType: "adjustment"
      });
      createdReference = String(created.item.reference || "").trim();
      nextStatus = "created";
    } else if (resolution.action === "ignore") {
      nextStatus = "ignored";
    } else if (resolution.action === "link_existing") {
      nextStatus = "ignored";
      createdReference = String(resolution.resolvedReference || "").trim();
    }
    linesSheet.getRange(rowIndex, 4, 1, 6).setValues([[
      nextStatus,
      line.duplicateStatus,
      JSON.stringify(line.rawRow || {}),
      String(line.mapped.reference || "").trim(),
      String(line.mapped.warehouse || "").trim(),
      String(line.mapped.arrivalNote || "").trim()
    ]]);
    linesSheet.getRange(rowIndex, 18, 1, 5).setValues([[
      String(resolution.action || "").trim(),
      String(resolution.resolvedReference || "").trim(),
      createdReference,
      String(row.created_at || nowIso),
      nowIso
    ]]);
  });

  const refreshedLines = readReferenceImportLines_(linesSheet, batchId);
  const hasPendingLines = refreshedLines.some(function(line) {
    return line.status === "valid" || line.status === "duplicate";
  });
  updateReferenceImportBatchStatus_(batchesSheet, batchId, hasPendingLines ? "review" : "finalized");
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    batch: getReferenceImportBatchPayload_(batchId).batch,
    lines: getReferenceImportBatchPayload_(batchId).lines,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function updateReferenceImportBatchStatus_(sheet, batchId, status) {
  const rows = readSheetObjects_(sheet);
  const row = rows.find(function(entry) {
    return String(entry.batch_id || "") === String(batchId || "");
  });
  if (!row) return;
  sheet.getRange(row._rowIndex, 4).setValue(String(status || "").trim());
}

function applyCreatePickupTicketMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : null;
  if (!request) throw new Error("Payload création ticket manquant.");
  const ticketsSheet = getOrCreatePickupTicketsSheet_();
  const linesSheet = getOrCreatePickupTicketLinesSheet_();
  const eventsSheet = getOrCreatePickupTicketEventsSheet_();
  const ticketId = buildGeneratedId_("pt");
  const ticketNumber = generatePickupTicketNumber_(ticketsSheet);
  const createdAt = new Date().toISOString();
  const requestLines = Array.isArray(request.lines) ? request.lines : [];
  const clientTicketId = String(request.clientTicketId || "").trim();
  const lineMappings = [];

  ticketsSheet.appendRow([
    ticketId,
    ticketNumber,
    "in_progress",
    createdAt,
    String(request.createdBy || "").trim(),
    createdAt,
    "",
    "",
    String(request.title || "").trim(),
    String(request.requestTextRaw || "").trim(),
    String(request.globalNote || "").trim(),
    requestLines.length,
    0,
    requestLines.length,
    1
  ]);

  if (requestLines.length) {
    linesSheet.getRange(linesSheet.getLastRow() + 1, 1, requestLines.length, 18).setValues(requestLines.map(function(line, index) {
      const item = findInventoryItemByReference_(normalizeReference_(line.reference));
      const serverLineId = buildGeneratedId_("ptl");
      lineMappings.push({
        clientLineId: String(line && line.clientLineId || "").trim(),
        lineId: serverLineId
      });
      return [
        serverLineId,
        ticketId,
        index + 1,
        normalizeReference_(line.reference),
        "to_confirm",
        String(line.requestUnit || "").trim(),
        line.requestQuantity == null ? "" : Number(line.requestQuantity || 0),
        buildTicketQuantityDisplay_(line.requestUnit, line.requestQuantity),
        "",
        "",
        "",
        item ? stateModelToPieces_(item) : "",
        buildWarehouseHelpDisplay_(line.reference),
        getArrivalNoteForReference_(line.reference),
        "",
        "",
        createdAt,
        createdAt
      ];
    }));
  }

  appendPickupTicketEvent_(eventsSheet, {
    ticketId: ticketId,
    lineId: "",
    eventType: "ticket_created",
    actor: String(request.createdBy || "").trim(),
    payload: { requestTextRaw: String(request.requestTextRaw || "").trim() },
    message: "Ticket créé"
  });

  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    clientTicketId: clientTicketId,
    lineMappings: lineMappings,
    ticket: getPickupTicketPayload_(ticketId).ticket,
    lines: getPickupTicketPayload_(ticketId).lines,
    events: getPickupTicketPayload_(ticketId).events,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function generatePickupTicketNumber_(sheet) {
  const timeZone = Session.getScriptTimeZone ? Session.getScriptTimeZone() : "Europe/Paris";
  const prefix = Utilities.formatDate(new Date(), timeZone || "Europe/Paris", "ddMMyyyy-");
  const existing = readPickupTickets_(sheet).filter(function(ticket) {
    return String(ticket.ticketNumber || "").indexOf(prefix) === 0;
  }).length;
  return prefix + ("000" + String(existing + 1)).slice(-3);
}

function buildTicketQuantityDisplay_(unit, quantity) {
  const safeUnit = String(unit || "").trim();
  const safeQuantity = Number(quantity || 0);
  if (!(safeQuantity > 0) || !safeUnit) return "";
  if (safeUnit === "box") return safeQuantity + "箱";
  if (safeUnit === "pack") return safeQuantity + "包";
  if (safeUnit === "piece") return safeQuantity + "件";
  return "";
}

function buildWarehouseHelpDisplay_(reference) {
  const normalizedReference = normalizeReference_(reference);
  if (!normalizedReference) return "";
  const sheet = getOptionalSheet_(SZFASHION_STOCK_SHEET);
  if (!sheet) return "";
  const items = readInventoryItems_(sheet).filter(function(item) {
    return normalizeReference_(item.reference) === normalizedReference && stateModelToPieces_(item) > 0;
  });
  const warehouses = [];
  items.forEach(function(item) {
    const warehouse = String(item.warehouse || "").trim();
    if (warehouse && warehouses.indexOf(warehouse) === -1) warehouses.push(warehouse);
  });
  return warehouses.join(" · ");
}

function getArrivalNoteForReference_(reference) {
  const item = findInventoryItemByReference_(normalizeReference_(reference));
  return item ? String(item.arrivalNote || "").trim() : "";
}

function appendPickupTicketEvent_(sheet, event) {
  sheet.appendRow([
    buildGeneratedId_("pte"),
    String(event.ticketId || "").trim(),
    String(event.lineId || "").trim(),
    String(event.eventType || "").trim(),
    String(event.actor || "").trim(),
    new Date().toISOString(),
    JSON.stringify(event.payload || {}),
    String(event.message || "").trim()
  ]);
}

function applyResolvePickupTicketLineMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : null;
  if (!request) throw new Error("Payload ligne ticket manquant.");
  const ticketId = String(request.ticketId || "").trim();
  const lineId = String(request.lineId || "").trim();
  const ticketsSheet = getOrCreatePickupTicketsSheet_();
  const linesSheet = getOrCreatePickupTicketLinesSheet_();
  const eventsSheet = getOrCreatePickupTicketEventsSheet_();
  const ticket = requirePickupTicketById_(ticketsSheet, ticketId);
  assertTicketVersion_(ticket, request.version);
  const line = requirePickupTicketLineById_(linesSheet, ticketId, lineId);
  const normalizedReference = normalizeReference_(line.reference);
  const stockItem = findInventoryItemByReference_(normalizedReference);
  const canonical = canonicalizePickupLineResolution_(line, request, stockItem);

  linesSheet.getRange(line._rowIndex, 5, 1, 14).setValues([[
    canonical.status,
    String(line.requestUnit || "").trim(),
    line.requestQuantity == null ? "" : Number(line.requestQuantity || 0),
    String(line.requestedDisplay || "").trim(),
    canonical.pickedUnit,
    canonical.pickedQuantity == null ? "" : Number(canonical.pickedQuantity || 0),
    canonical.pickedDisplay,
    stockItem ? stateModelToPieces_(stockItem) : "",
    buildWarehouseHelpDisplay_(normalizedReference),
    getArrivalNoteForReference_(normalizedReference),
    String(request.lineNote || "").trim(),
    String(line.stockMutationId || "").trim(),
    String(line.createdAt || ""),
    new Date().toISOString()
  ]]);

  updatePickupTicketCounters_(ticketsSheet, linesSheet, ticketId, ticket.version + 1);
  appendPickupTicketEvent_(eventsSheet, {
    ticketId: ticketId,
    lineId: lineId,
    eventType: canonical.status === "not_found" ? "line_marked_not_found" : (canonical.status === "partial" ? "line_marked_partial" : "line_updated"),
    actor: String(request.updatedBy || "").trim(),
    payload: Object.assign({ reference: normalizedReference }, canonical),
    message: canonical.status === "not_found" ? "Ligne marquée introuvable" : (canonical.status === "to_confirm" ? "Ligne rouverte" : "Ligne confirmée")
  });

  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: getPickupTicketPayload_(ticketId).ticket,
    lines: getPickupTicketPayload_(ticketId).lines,
    events: getPickupTicketPayload_(ticketId).events,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function requirePickupTicketById_(sheet, ticketId) {
  const ticket = readPickupTickets_(sheet).find(function(entry) {
    return String(entry.ticketId || "") === String(ticketId || "");
  });
  if (!ticket) throw new Error("Ticket introuvable.");
  return ticket;
}

function requirePickupTicketLineById_(sheet, ticketId, lineId) {
  const line = readPickupTicketLines_(sheet, ticketId).find(function(entry) {
    return String(entry.lineId || "") === String(lineId || "");
  });
  if (!line) throw new Error("Ligne ticket introuvable.");
  return line;
}

function assertTicketVersion_(ticket, requestedVersion) {
  const expected = Number(ticket && ticket.version || 0);
  const received = Number(requestedVersion || 0);
  if (expected > 0 && received > 0 && expected !== received) {
    throw new Error("Conflit de version ticket. Recharge le ticket.");
  }
}

function canonicalizePickupLineResolution_(line, request, stockItem) {
  const explicitStatus = String(request.status || "").trim();
  if (explicitStatus === "cancelled") {
    return { status: "cancelled", pickedUnit: "", pickedQuantity: null, pickedDisplay: "" };
  }
  if (explicitStatus === "to_confirm") {
    return { status: "to_confirm", pickedUnit: "", pickedQuantity: null, pickedDisplay: "" };
  }
  if (explicitStatus === "not_found") {
    return { status: "not_found", pickedUnit: "", pickedQuantity: null, pickedDisplay: "" };
  }
  const pickedUnit = String(request.pickedUnit || "").trim();
  const pickedQuantity = parseNullableNumber_(request.pickedQuantity);
  if (!pickedUnit || !(pickedQuantity > 0)) {
    throw new Error("Quantité réelle obligatoire pour résoudre la ligne.");
  }
  const pickedDisplay = buildTicketQuantityDisplay_(pickedUnit, pickedQuantity);
  if (!pickedDisplay) throw new Error("Unité ticket non supportée.");
  if (stockItem) {
    const availablePieces = stateModelToPieces_(stockItem);
    const pickedPieces = convertTicketQuantityToPieces_(stockItem, pickedUnit, pickedQuantity);
    if (pickedPieces > availablePieces) throw new Error("Quantité ticket supérieure au stock disponible.");
    const requestedPieces = line.requestUnit && line.requestQuantity
      ? convertTicketQuantityToPieces_(stockItem, line.requestUnit, line.requestQuantity)
      : 0;
    const status = requestedPieces > 0 && pickedPieces < requestedPieces ? "partial" : "ready";
    return { status: status, pickedUnit: pickedUnit, pickedQuantity: pickedQuantity, pickedDisplay: pickedDisplay };
  }
  return { status: "ready", pickedUnit: pickedUnit, pickedQuantity: pickedQuantity, pickedDisplay: pickedDisplay };
}

function updatePickupTicketCounters_(ticketsSheet, linesSheet, ticketId, nextVersion) {
  const ticket = requirePickupTicketById_(ticketsSheet, ticketId);
  const lines = readPickupTicketLines_(linesSheet, ticketId);
  const resolvedLineCount = lines.filter(function(line) {
    return line.status === "ready" || line.status === "partial" || line.status === "not_found" || line.status === "validated" || line.status === "cancelled";
  }).length;
  const blockedLineCount = lines.filter(function(line) {
    return line.status === "to_confirm";
  }).length;
  const nextStatus = ticket.status === "validated" || ticket.status === "cancelled"
    ? ticket.status
    : "in_progress";
  ticketsSheet.getRange(ticket._rowIndex, 3, 1, 13).setValues([[
    nextStatus,
    String(ticket.createdAt || ""),
    String(ticket.createdBy || ""),
    new Date().toISOString(),
    String(ticket.validatedAt || ""),
    String(ticket.validatedBy || ""),
    String(ticket.title || ""),
    String(ticket.requestTextRaw || ""),
    String(ticket.globalNote || ""),
    lines.length,
    resolvedLineCount,
    blockedLineCount,
    Number(nextVersion || 0)
  ]]);
}

function applyValidatePickupTicketMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : null;
  if (!request) throw new Error("Payload validation ticket manquant.");
  const ticketId = String(request.ticketId || "").trim();
  console.log("[applyValidatePickupTicketMutation_] start ticketId=%s version=%s requestLines=%s mutationId=%s", ticketId, String(request.version || ""), String(Array.isArray(request.lines) ? request.lines.length : 0), String(mutation && mutation.id || ""));
  const ticketsSheet = getOrCreatePickupTicketsSheet_();
  const linesSheet = getOrCreatePickupTicketLinesSheet_();
  const eventsSheet = getOrCreatePickupTicketEventsSheet_();
  const stockSheet = getRequiredSheet_(SZFASHION_STOCK_SHEET);
  const stockHeaders = stockSheet.getRange(1, 1, 1, stockSheet.getLastColumn()).getDisplayValues()[0];
  const stockCols = resolveInventoryColumns_(stockHeaders);
  const ticket = requirePickupTicketById_(ticketsSheet, ticketId);
  assertTicketVersion_(ticket, request.version);
  if (ticket.status === "validated" || ticket.status === "cancelled") {
    throw new Error("Ce ticket est déjà clôturé.");
  }
  const lines = readPickupTicketLines_(linesSheet, ticketId);
  const lineById = {};
  lines.forEach(function(line) { lineById[line.lineId] = line; });
  const requestLines = Array.isArray(request.lines) ? request.lines : [];
  requestLines.forEach(function(requestLine) {
    if (!requestLine || !requestLine.lineId) return;
    const line = lineById[String(requestLine.lineId)];
    if (!line) return;
    const stockItem = findInventoryItemByReference_(line.reference);
    const canonical = canonicalizePickupLineResolution_(line, requestLine, stockItem);
    line.status = canonical.status;
    line.pickedUnit = canonical.pickedUnit;
    line.pickedQuantity = canonical.pickedQuantity;
    line.pickedDisplay = canonical.pickedDisplay;
    console.log("[applyValidatePickupTicketMutation_] line prepared ticketId=%s lineId=%s reference=%s picked=%s%s status=%s", ticketId, String(line.lineId || ""), String(line.reference || ""), String(line.pickedQuantity || ""), String(line.pickedUnit || ""), String(line.status || ""));
  });

  const blockingLine = lines.find(function(line) {
    return line.status === "to_confirm"
      || ((line.status === "ready" || line.status === "partial") && (!line.pickedUnit || !(Number(line.pickedQuantity || 0) > 0)));
  });
  if (blockingLine) throw new Error("Impossible de valider : une ligne reste à confirmer.");

  lines.forEach(function(line) {
    if (line.status === "not_found" || line.status === "cancelled") return;
    const stockRowIndex = findInventoryRowIndexByReference_(stockSheet, stockCols, line.reference);
    if (stockRowIndex < 2) throw new Error("Référence introuvable dans STOCK : " + line.reference);
    console.log("[applyValidatePickupTicketMutation_] stock row found ticketId=%s lineId=%s reference=%s row=%s", ticketId, String(line.lineId || ""), String(line.reference || ""), String(stockRowIndex || ""));
    const beforeRow = stockSheet.getRange(stockRowIndex, 1, 1, stockSheet.getLastColumn()).getDisplayValues()[0];
    const beforeItem = buildInventoryItem_(beforeRow, stockCols, stockRowIndex);
    const nextState = convertTicketQuantityToStockMutation_(beforeItem, {
      unit: line.pickedUnit,
      quantity: line.pickedQuantity
    });
    writeQuickEditToStockRow_(stockSheet, stockCols, stockRowIndex, {
      tail: nextState.tail,
      unitsPerBox: nextState.unitsPerBox,
      itemBoxes: nextState.itemBoxes,
      sign: nextState.sign,
      fractionText: nextState.fractionText,
      packNotation: nextState.packNotation
    }, beforeItem);
    const afterRow = stockSheet.getRange(stockRowIndex, 1, 1, stockSheet.getLastColumn()).getDisplayValues()[0];
    const afterItem = buildInventoryItem_(afterRow, stockCols, stockRowIndex);
    const historyEntry = appendHistoryForMutation_({
      actionType: "pickup_ticket",
      request: {
        remark: String(line.lineNote || "").trim(),
        businessId: ticketId,
        businessLineId: line.lineId
      }
    }, beforeItem, afterItem);
    console.log("[applyValidatePickupTicketMutation_] history written ticketId=%s lineId=%s historyId=%s before=%s after=%s", ticketId, String(line.lineId || ""), String(historyEntry && historyEntry.id || ""), String(beforeItem && beforeItem.stockDisplay || ""), String(afterItem && afterItem.stockDisplay || ""));
    line.stockMutationId = String(historyEntry && historyEntry.id || "").trim();
    line.status = "validated";
    linesSheet.getRange(line._rowIndex, 5, 1, 14).setValues([[
      line.status,
      line.requestUnit || "",
      line.requestQuantity == null ? "" : line.requestQuantity,
      line.requestedDisplay || "",
      line.pickedUnit || "",
      line.pickedQuantity == null ? "" : line.pickedQuantity,
      line.pickedDisplay || "",
      line.stockAvailablePiecesSnapshot == null ? "" : line.stockAvailablePiecesSnapshot,
      line.warehouseHelpDisplay || "",
      line.arrivalNoteSnapshot || "",
      line.lineNote || "",
      line.stockMutationId || "",
      line.createdAt || "",
      new Date().toISOString()
    ]]);
  });

  ticketsSheet.getRange(ticket._rowIndex, 3, 1, 13).setValues([[
    "validated",
    String(ticket.createdAt || ""),
    String(ticket.createdBy || ""),
    new Date().toISOString(),
    new Date().toISOString(),
    String(request.validatedBy || "").trim(),
    String(ticket.title || ""),
    String(ticket.requestTextRaw || ""),
    String(ticket.globalNote || ""),
    lines.length,
    lines.length,
    0,
    Number(ticket.version || 0) + 1
  ]]);
  appendPickupTicketEvent_(eventsSheet, {
    ticketId: ticketId,
    lineId: "",
    eventType: "ticket_validated",
    actor: String(request.validatedBy || "").trim(),
    payload: { lines: lines.map(function(line) { return { lineId: line.lineId, status: line.status, pickedDisplay: line.pickedDisplay }; }) },
    message: "Ticket validé"
  });
  console.log("[applyValidatePickupTicketMutation_] success ticketId=%s validatedLines=%s", ticketId, String(lines.length || 0));
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: getPickupTicketPayload_(ticketId).ticket,
    lines: getPickupTicketPayload_(ticketId).lines,
    events: getPickupTicketPayload_(ticketId).events,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function applyCancelPickupTicketMutation_(mutation) {
  const request = mutation && mutation.request ? mutation.request : null;
  if (!request) throw new Error("Payload annulation ticket manquant.");
  const ticketId = String(request.ticketId || "").trim();
  const ticketsSheet = getOrCreatePickupTicketsSheet_();
  const eventsSheet = getOrCreatePickupTicketEventsSheet_();
  const ticket = requirePickupTicketById_(ticketsSheet, ticketId);
  if (ticket.status === "validated") throw new Error("Impossible d'annuler un ticket déjà validé.");
  ticketsSheet.getRange(ticket._rowIndex, 3).setValue("cancelled");
  ticketsSheet.getRange(ticket._rowIndex, 6).setValue(new Date().toISOString());
  appendPickupTicketEvent_(eventsSheet, {
    ticketId: ticketId,
    lineId: "",
    eventType: "ticket_cancelled",
    actor: String(request.cancelledBy || "").trim(),
    payload: {},
    message: "Ticket annulé"
  });
  return {
    ok: true,
    mutationId: String(mutation.id || ""),
    ticket: getPickupTicketPayload_(ticketId).ticket,
    lines: getPickupTicketPayload_(ticketId).lines,
    events: getPickupTicketPayload_(ticketId).events,
    generatedAt: new Date().toISOString(),
    source: "google_sheets"
  };
}

function findInventoryRowIndexByReference_(sheet, cols, reference) {
  const expectedReference = normalizeReference_(reference);
  if (!expectedReference) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const references = sheet.getRange(2, cols.reference + 1, lastRow - 1, 1).getDisplayValues();
  for (let index = 0; index < references.length; index++) {
    if (normalizeReference_(references[index][0]) === expectedReference) return index + 2;
  }
  return -1;
}

function convertTicketQuantityToPieces_(referenceItem, unit, quantity) {
  const safeUnit = String(unit || "").trim();
  const safeQuantity = Number(quantity || 0);
  if (!(safeQuantity > 0)) throw new Error("Quantité ticket invalide.");
  if (safeUnit === "piece") return Math.round(safeQuantity);
  if (safeUnit === "box") {
    const unitsPerBox = Math.max(0, parseLooseInteger_(referenceItem && referenceItem.unitsPerBox));
    if (!(unitsPerBox > 0)) throw new Error("Impossible de convertir en 箱 sans 件/箱.");
    return Math.round(safeQuantity * unitsPerBox);
  }
  if (safeUnit === "pack") {
    const packSize = Math.max(0, parseLooseInteger_(referenceItem && referenceItem.colisage));
    if (!(packSize > 0)) throw new Error("Impossible de convertir en 包 sans Colisage.");
    return Math.round(safeQuantity * packSize);
  }
  throw new Error("Unité ticket non supportée.");
}

function convertTicketQuantityToStockMutation_(referenceItem, ticketQuantity) {
  const item = referenceItem || {};
  const beforePieces = stateModelToPieces_(item);
  const removePieces = convertTicketQuantityToPieces_(item, ticketQuantity && ticketQuantity.unit, ticketQuantity && ticketQuantity.quantity);
  if (removePieces > beforePieces) throw new Error("Quantité ticket supérieure au stock disponible.");
  const afterPieces = beforePieces - removePieces;
  return buildStateFromPiecesServer_(afterPieces, {
    unitsPerBox: item.unitsPerBox,
    colisage: item.colisage,
    remark: item.remark,
    reconstructionMode: String(ticketQuantity && ticketQuantity.unit || "").trim() === "pack" ? "packs" : ""
  });
}

function normalizeStateModelServer_(stateInput) {
  const state = {
    tail: Math.max(0, parseLooseInteger_(stateInput && stateInput.tail)),
    unitsPerBox: Math.max(0, parseLooseInteger_(stateInput && stateInput.unitsPerBox)),
    itemBoxes: Math.max(0, parseLooseInteger_(stateInput && stateInput.itemBoxes)),
    sign: normalizeSign_(stateInput && stateInput.sign),
    fractionText: normalizeFractionText_(stateInput && stateInput.fractionText),
    fractionValue: parseFractionValue_(stateInput && (stateInput.fractionValue || stateInput.fractionText)),
    colisage: Math.max(0, parseLooseInteger_(stateInput && stateInput.colisage)),
    packNotation: normalizePackNotation_(stateInput && stateInput.packNotation),
    remark: String(stateInput && stateInput.remark || "").trim()
  };
  if (!(state.fractionValue > 0)) {
    state.fractionValue = 0;
    state.fractionText = "";
    state.sign = "";
  } else if (!state.sign) {
    state.sign = state.itemBoxes > 0 ? "+" : "×";
  }
  if (!state.fractionText && state.fractionValue > 0) {
    state.fractionText = fractionTextFromPiecesServer_(Math.round(state.fractionValue * state.unitsPerBox), state.unitsPerBox);
  }
  if (state.sign === "×" && state.itemBoxes <= 0) state.itemBoxes = 1;
  if (state.sign === "+" && state.itemBoxes <= 0) {
    state.sign = "×";
    state.itemBoxes = 1;
  }
  return state;
}

function reduceFractionServer_(num, den) {
  function gcd_(left, right) {
    return right ? gcd_(right, left % right) : left;
  }
  const safeNum = Math.max(0, parseLooseInteger_(num));
  const safeDen = Math.max(1, parseLooseInteger_(den));
  const divisor = gcd_(safeNum, safeDen);
  return { num: safeNum / divisor, den: safeDen / divisor };
}

function fractionTextFromPiecesServer_(pieces, unitsPerBox) {
  const safePieces = Math.max(0, parseLooseInteger_(pieces));
  const safeUnits = Math.max(0, parseLooseInteger_(unitsPerBox));
  if (!(safePieces > 0) || !(safeUnits > 0)) return "";
  const reduced = reduceFractionServer_(safePieces, safeUnits);
  return reduced.num + "/" + reduced.den;
}

function buildSimpleStateFromPiecesServer_(totalPiecesInput, options) {
  const totalPieces = Math.max(0, Number(totalPiecesInput || 0));
  const unitsPerBox = Math.max(0, parseLooseInteger_(options && options.unitsPerBox));
  const colisage = Math.max(0, parseLooseInteger_(options && options.colisage));
  const remark = String(options && options.remark || "").trim();
  if (!(unitsPerBox > 0)) throw new Error("Conversion ticket impossible sans 件/箱.");
  const wholeBoxes = Math.floor(totalPieces / unitsPerBox);
  const remainderPieces = Math.max(0, totalPieces - (wholeBoxes * unitsPerBox));
  if (!(remainderPieces > 0)) {
    return normalizeStateModelServer_({
      tail: 0,
      unitsPerBox: unitsPerBox,
      itemBoxes: wholeBoxes,
      sign: "",
      fractionText: "",
      fractionValue: 0,
      colisage: colisage,
      packNotation: "",
      remark: remark
    });
  }
  return normalizeStateModelServer_({
    tail: 0,
    unitsPerBox: unitsPerBox,
    itemBoxes: wholeBoxes > 0 ? wholeBoxes : 1,
    sign: wholeBoxes > 0 ? "+" : "×",
    fractionText: fractionTextFromPiecesServer_(remainderPieces, unitsPerBox),
    fractionValue: remainderPieces / unitsPerBox,
    colisage: colisage,
    packNotation: "",
    remark: remark
  });
}

function buildPackFriendlyStateFromPiecesServer_(totalPiecesInput, options) {
  const totalPieces = Math.max(0, Number(totalPiecesInput || 0));
  const unitsPerBox = Math.max(0, parseLooseInteger_(options && options.unitsPerBox));
  const colisage = Math.max(0, parseLooseInteger_(options && options.colisage));
  const remark = String(options && options.remark || "").trim();
  if (!(unitsPerBox > 0)) throw new Error("Conversion ticket impossible sans 件/箱.");
  const wholeBoxes = Math.floor(totalPieces / unitsPerBox);
  const remainderPieces = Math.max(0, totalPieces - (wholeBoxes * unitsPerBox));
  if (!(remainderPieces > 0)) return buildSimpleStateFromPiecesServer_(totalPieces, options);
  const packsPerBox = colisage > 0 && unitsPerBox % colisage === 0 ? unitsPerBox / colisage : 0;
  if (packsPerBox > 0 && remainderPieces % colisage === 0) {
    const packCount = remainderPieces / colisage;
    return normalizeStateModelServer_({
      tail: 0,
      unitsPerBox: unitsPerBox,
      itemBoxes: wholeBoxes > 0 ? wholeBoxes : 1,
      sign: wholeBoxes > 0 ? "+" : "×",
      fractionText: packCount + "/" + packsPerBox,
      fractionValue: packCount / packsPerBox,
      colisage: colisage,
      packNotation: "",
      remark: remark
    });
  }
  return buildSimpleStateFromPiecesServer_(totalPieces, options);
}

function buildStateFromPiecesServer_(totalPiecesInput, options) {
  const reconstructionMode = String(options && options.reconstructionMode || "").trim();
  return reconstructionMode === "packs"
    ? buildPackFriendlyStateFromPiecesServer_(totalPiecesInput, options)
    : buildSimpleStateFromPiecesServer_(totalPiecesInput, options);
}
