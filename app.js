const STORAGE_KEY = "szfashion-stockmobile-local-v1";

const seedItems = [
  { id: "row_2", reference: "SZ-DR-014", sortKey: "SZ-DR-014", tail: 85, unitsPerBox: 144, itemBoxes: 3, sign: "+", fractionText: "1/2", fractionValue: 0.5, colisage: 12, packNotation: "+2包", remark: "B2 haut droite", warehouse: "B2", createdAt: "15/02/2026" },
  { id: "row_3", reference: "SZ-TS-001", sortKey: "SZ-TS-001", tail: 0, unitsPerBox: 120, itemBoxes: 4, sign: "+", fractionText: "1/3", fractionValue: 1 / 3, colisage: 10, packNotation: "", remark: "A1 table 3", warehouse: "A1", createdAt: "12/02/2026" },
  { id: "row_4", reference: "SZ-JK-203", sortKey: "SZ-JK-203", tail: 0, unitsPerBox: 96, itemBoxes: 2, sign: "", fractionText: "", fractionValue: 0, colisage: 12, packNotation: "", remark: "B1 rack veste", warehouse: "B1", createdAt: "18/02/2026" },
  { id: "row_5", reference: "SZ-BL-032", sortKey: "SZ-BL-032", tail: 0, unitsPerBox: 72, itemBoxes: 5, sign: "+", fractionText: "2/3", fractionValue: 2 / 3, colisage: 6, packNotation: "", remark: "", warehouse: "A2", createdAt: "20/02/2026" },
  { id: "row_6", reference: "SZ-KN-087", sortKey: "SZ-KN-087", tail: 24, unitsPerBox: 48, itemBoxes: 2, sign: "+", fractionText: "1/4", fractionValue: 0.25, colisage: 12, packNotation: "+1包", remark: "C1 maille", warehouse: "C1", createdAt: "24/02/2026" },
  { id: "row_7", reference: "SZ-PT-119", sortKey: "SZ-PT-119", tail: 0, unitsPerBox: 60, itemBoxes: 1, sign: "+", fractionText: "1/2", fractionValue: 0.5, colisage: 12, packNotation: "", remark: "C3 bas", warehouse: "C3", createdAt: "01/03/2026" },
  { id: "row_8", reference: "SZ-SH-021", sortKey: "SZ-SH-021", tail: 0, unitsPerBox: 84, itemBoxes: 3, sign: "", fractionText: "", fractionValue: 0, colisage: 12, packNotation: "", remark: "A2 entrée", warehouse: "A2", createdAt: "04/03/2026" },
  { id: "row_9", reference: "SZ-AC-410", sortKey: "SZ-AC-410", tail: 0, unitsPerBox: 144, itemBoxes: 1, sign: "+", fractionText: "1/6", fractionValue: 1 / 6, colisage: 24, packNotation: "", remark: "C3 accessoires", warehouse: "C3", createdAt: "08/03/2026" },
  { id: "row_10", reference: "SZ-DR-028", sortKey: "SZ-DR-028", tail: 1, unitsPerBox: 96, itemBoxes: 0, sign: "", fractionText: "", fractionValue: 0, colisage: 12, packNotation: "", remark: "Showroom", warehouse: "B1", createdAt: "11/03/2026" },
  { id: "row_11", reference: "SZ-SK-055", sortKey: "SZ-SK-055", tail: 2, unitsPerBox: 72, itemBoxes: 0, sign: "", fractionText: "", fractionValue: 0, colisage: 6, packNotation: "", remark: "Reste ouvert", warehouse: "B2", createdAt: "09/03/2026" },
  { id: "row_12", reference: "SZ-CT-301", sortKey: "SZ-CT-301", tail: 0, unitsPerBox: 120, itemBoxes: 0, sign: "", fractionText: "", fractionValue: 0, colisage: 10, packNotation: "", remark: "", warehouse: "C2", createdAt: "27/02/2026" },
  { id: "row_13", reference: "SZ-TS-008", sortKey: "SZ-TS-008", tail: 0, unitsPerBox: 120, itemBoxes: 0, sign: "", fractionText: "", fractionValue: 0, colisage: 10, packNotation: "", remark: "Rupture", warehouse: "A1", createdAt: "18/01/2026" }
];

const seedHistory = [
  { timestampRaw: "2026-03-28T09:10:00.000Z", actionType: "adjustment", reference: "SZ-TS-001", rowId: "row_3", beforeDisplay: "120p×4", afterDisplay: "120p×4+1/3", remark: "Ajustement comptage", source: "stock_mobile_quick_edit", beforeTotalPieces: 480, afterTotalPieces: 520 },
  { timestampRaw: "2026-03-27T16:30:00.000Z", actionType: "exit", reference: "SZ-DR-014", rowId: "row_2", beforeDisplay: "(85p)+144p×3+2/3+2包", afterDisplay: "(85p)+144p×3+1/2+2包", remark: "Sortie showroom", source: "stock_mobile_quick_edit", beforeTotalPieces: 649, afterTotalPieces: 643 },
  { timestampRaw: "2026-03-27T11:45:00.000Z", actionType: "adjustment", reference: "SZ-BL-032", rowId: "row_5", beforeDisplay: "72p×5+1/2", afterDisplay: "72p×5+2/3", remark: "Correction fraction", source: "stock_mobile_quick_edit", beforeTotalPieces: 396, afterTotalPieces: 408 },
  { timestampRaw: "2026-03-26T18:05:00.000Z", actionType: "exit", reference: "SZ-JK-203", rowId: "row_4", beforeDisplay: "96p×3", afterDisplay: "96p×2", remark: "Client export", source: "stock_mobile_quick_edit", beforeTotalPieces: 288, afterTotalPieces: 192 },
  { timestampRaw: "2026-03-26T10:20:00.000Z", actionType: "entry", reference: "SZ-SH-021", rowId: "row_8", beforeDisplay: "84p×2", afterDisplay: "84p×3", remark: "Réception repassage", source: "stock_mobile_quick_edit", beforeTotalPieces: 168, afterTotalPieces: 252 },
  { timestampRaw: "2026-03-25T17:15:00.000Z", actionType: "exit", reference: "SZ-TS-008", rowId: "row_13", beforeDisplay: "120p×1", afterDisplay: "-", remark: "Fin de lot", source: "stock_mobile_quick_edit", beforeTotalPieces: 120, afterTotalPieces: 0 },
  { timestampRaw: "2026-03-25T09:40:00.000Z", actionType: "entry", reference: "SZ-KN-087", rowId: "row_6", beforeDisplay: "(24p)+48p×2+1/4", afterDisplay: "(24p)+48p×2+1/4+1包", remark: "Ajout paquets", source: "stock_mobile_quick_edit", beforeTotalPieces: 132, afterTotalPieces: 144 },
  { timestampRaw: "2026-03-24T15:50:00.000Z", actionType: "adjustment", reference: "SZ-AC-410", rowId: "row_9", beforeDisplay: "144p×1", afterDisplay: "144p×1+1/6", remark: "", source: "stock_mobile_quick_edit", beforeTotalPieces: 144, afterTotalPieces: 168 }
].map(function(entry, index) {
  return Object.assign({ id: "seed-his-" + String(index + 1), timestampLabel: formatHistoryTimestamp(entry.timestampRaw) }, entry);
});

const state = {
  items: [],
  historyItems: [],
  query: "",
  historyQuery: "",
  historyActionType: "",
  columnCount: 2,
  currentView: "inventory",
  detailReference: "",
  quickEditOpen: false,
  quickEditTab: "quick-exit",
  quickEditItemId: "",
  quickEditForm: null,
  quickExitForm: null
};

function getCurrentPage() {
  return document.body ? document.body.dataset.page || "" : "";
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function normalizeReference(value) {
  return String(value || "").toUpperCase().replace(/\s+/g, " ").trim();
}

function toInt(value) {
  if (value === null || typeof value === "undefined" || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  const match = String(value).trim().match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function parsePositiveNumber(value) {
  if (value === null || typeof value === "undefined" || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  const normalized = String(value).trim().replace(",", ".");
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function normalizeFractionText(value) {
  const text = String(value === null || typeof value === "undefined" ? "" : value).trim().replace(/\s+/g, "");
  if (!text) return "";
  const match = text.match(/^(\d+)\/(\d+)$/);
  return match ? match[1] + "/" + match[2] : "";
}

function parseFractionValue(value) {
  if (value === null || typeof value === "undefined" || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  const text = String(value).trim().replace(",", ".");
  const fractionMatch = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    return numerator > 0 && denominator > 0 ? numerator / denominator : 0;
  }
  const numeric = Number(text);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function normalizeSign(value) {
  const sign = String(value || "").trim();
  return sign === "+" || sign === "×" ? sign : "";
}

function normalizePackNotation(value, strict) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^([+-])\s*(\d+)\s*包$/i);
  if (!match) {
    if (strict) throw new Error("Notation paquets invalide. Utilise +N包 ou -N包.");
    return text;
  }
  const count = Math.max(0, Math.trunc(Number(match[2]) || 0));
  return count > 0 ? match[1] + count + "包" : "";
}

function normalizeTailRelativeNotation(value) {
  const text = String(value || "").trim().replace(/^TAIL:/i, "");
  if (!text) return "";
  const packNotation = normalizePackNotation(text, false);
  if (/^-\d+包$/.test(packNotation)) return packNotation;
  const fractionText = normalizeFractionText(text);
  return fractionText && parseFractionValue(fractionText) > 0 ? fractionText : "";
}

function splitCompositePackNotation(value) {
  const text = String(value || "").trim();
  if (!text) return { tailNotation: "", mainNotation: "" };
  const parts = text.split("|");
  let tailNotation = "";
  let mainNotation = "";
  parts.forEach(function(part) {
    const token = String(part || "").trim();
    if (!token) return;
    if (/^TAIL:/i.test(token)) {
      if (!tailNotation) tailNotation = normalizeTailRelativeNotation(token);
      return;
    }
    const packNotation = normalizePackNotation(token, false);
    if (!mainNotation && /^([+-])\d+包$/.test(packNotation)) mainNotation = packNotation;
  });
  return { tailNotation: tailNotation, mainNotation: mainNotation };
}

function buildCompositePackNotation(tailNotation, mainNotation) {
  const normalizedTail = normalizeTailRelativeNotation(tailNotation);
  const normalizedMain = normalizePackNotation(mainNotation, false);
  if (normalizedTail && normalizedMain) return "TAIL:" + normalizedTail + "|" + normalizedMain;
  if (normalizedTail) return "TAIL:" + normalizedTail;
  return /^([+-])\d+包$/.test(normalizedMain) ? normalizedMain : "";
}

function getTailNotationFromState(stateInput) {
  return splitCompositePackNotation(stateInput && stateInput.packNotation).tailNotation;
}

function getMainPackNotationFromState(stateInput) {
  return splitCompositePackNotation(stateInput && stateInput.packNotation).mainNotation;
}

function buildPackNotationFromParts(signValue, countValue, fallbackValue) {
  const sign = String(signValue || "").trim();
  const count = Math.max(0, toInt(countValue));
  if ((sign === "+" || sign === "-") && count > 0) return sign + count + "包";
  const composite = splitCompositePackNotation(fallbackValue);
  if (composite.tailNotation || composite.mainNotation) {
    return buildCompositePackNotation(composite.tailNotation, composite.mainNotation);
  }
  return normalizePackNotation(fallbackValue, false);
}

function parsePackNotation(value) {
  const normalized = normalizePackNotation(value, false);
  const match = normalized.match(/^([+-])(\d+)包$/);
  if (!match) return { notation: normalized, sign: "", count: 0, valid: !normalized };
  return { notation: normalized, sign: match[1], count: Number(match[2]) || 0, valid: true };
}

function computePacksPerBox(unitsPerBox, colisage) {
  const units = Math.max(0, toInt(unitsPerBox));
  const packSize = Math.max(0, toInt(colisage));
  if (!(units > 0) || !(packSize > 0) || units % packSize !== 0) return 0;
  return units / packSize;
}

function normalizeStateModel(stateInput) {
  const state = {
    tail: Math.max(0, toInt(stateInput.tail)),
    unitsPerBox: Math.max(0, toInt(stateInput.unitsPerBox)),
    itemBoxes: Math.max(0, toInt(stateInput.itemBoxes)),
    sign: normalizeSign(stateInput.sign),
    fractionText: normalizeFractionText(stateInput.fractionText),
    fractionValue: parseFractionValue(stateInput.fractionValue || stateInput.fractionText),
    colisage: parsePositiveNumber(stateInput.colisage),
    packNotation: String(stateInput.packNotation || "").trim(),
    remark: String(stateInput.remark || "").trim()
  };

  if (!(state.fractionValue > 0)) {
    state.fractionValue = 0;
    state.fractionText = "";
    state.sign = "";
  } else if (!state.sign) {
    state.sign = state.itemBoxes > 0 ? "+" : "×";
  }

  if (!state.fractionText && state.fractionValue > 0) {
    state.fractionText = fractionTextFromPieces(state.fractionValue * state.unitsPerBox, state.unitsPerBox);
  }

  if (state.sign === "×" && state.itemBoxes <= 0) state.itemBoxes = 1;
  if (state.sign === "+" && state.itemBoxes <= 0) {
    state.sign = "×";
    state.itemBoxes = 1;
  }

  return state;
}

function getTailActualPieces(stateInput) {
  const tailBase = Math.max(0, toInt(stateInput && stateInput.tail));
  const tailNotation = getTailNotationFromState(stateInput);
  if (!(tailBase > 0) || !tailNotation) return tailBase;
  if (/^-\d+包$/.test(tailNotation)) {
    const packMeta = parsePackNotation(tailNotation);
    const colisage = Math.max(0, toInt(stateInput && stateInput.colisage));
    return Math.max(0, tailBase - (packMeta.count * colisage));
  }
  const fractionValue = parseFractionValue(tailNotation);
  return fractionValue > 0 ? Math.max(0, tailBase * fractionValue) : tailBase;
}

function stateModelToPieces(stateInput) {
  const state = normalizeStateModel(stateInput || {});
  let totalPieces = getTailActualPieces(state);

  if (state.unitsPerBox > 0) {
    if (state.sign === "+") {
      totalPieces += (state.unitsPerBox * state.itemBoxes) + (state.unitsPerBox * state.fractionValue);
    } else if (state.sign === "×") {
      if (state.itemBoxes > 1) {
        totalPieces += state.unitsPerBox * state.itemBoxes * state.fractionValue;
      } else if (state.itemBoxes > 0 || state.fractionValue > 0) {
        totalPieces += state.unitsPerBox * state.fractionValue;
      }
    } else {
      totalPieces += state.unitsPerBox * state.itemBoxes;
    }
  }

  const packMeta = parsePackNotation(getMainPackNotationFromState(state));
  if (packMeta.count > 0 && state.colisage > 0) {
    totalPieces += (packMeta.sign === "-" ? -1 : 1) * (packMeta.count * state.colisage);
  }

  return totalPieces;
}

function reduceFraction(num, den) {
  function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
  }
  const safeNum = Math.max(0, toInt(num));
  const safeDen = Math.max(1, toInt(den));
  const divisor = gcd(safeNum, safeDen);
  return { num: safeNum / divisor, den: safeDen / divisor };
}

function fractionTextFromPieces(pieces, unitsPerBox) {
  const safePieces = Math.max(0, toInt(pieces));
  const safeUnits = Math.max(0, toInt(unitsPerBox));
  if (!(safePieces > 0) || !(safeUnits > 0)) return "";
  const reduced = reduceFraction(safePieces, safeUnits);
  return reduced.num + "/" + reduced.den;
}

function buildSimpleStateFromPieces(totalPiecesInput, options) {
  const totalPieces = Math.max(0, Number(totalPiecesInput || 0));
  const unitsPerBox = Math.max(0, toInt(options && options.unitsPerBox));
  const colisage = Math.max(0, toInt(options && options.colisage));
  const remark = String(options && options.remark || "").trim();
  if (!(unitsPerBox > 0)) throw new Error("Sortie rapide impossible sans 件/箱.");

  const wholeBoxes = Math.floor(totalPieces / unitsPerBox);
  const remainderPieces = Math.max(0, totalPieces - (wholeBoxes * unitsPerBox));

  if (!(remainderPieces > 0)) {
    return normalizeStateModel({ tail: 0, unitsPerBox: unitsPerBox, itemBoxes: wholeBoxes, sign: "", fractionText: "", fractionValue: 0, colisage: colisage, packNotation: "", remark: remark });
  }

  return normalizeStateModel({
    tail: 0,
    unitsPerBox: unitsPerBox,
    itemBoxes: wholeBoxes > 0 ? wholeBoxes : 1,
    sign: wholeBoxes > 0 ? "+" : "×",
    fractionText: fractionTextFromPieces(remainderPieces, unitsPerBox),
    fractionValue: remainderPieces / unitsPerBox,
    colisage: colisage,
    packNotation: "",
    remark: remark
  });
}

function buildPackFriendlyStateFromPieces(totalPiecesInput, options) {
  const totalPieces = Math.max(0, Number(totalPiecesInput || 0));
  const unitsPerBox = Math.max(0, toInt(options && options.unitsPerBox));
  const colisage = Math.max(0, toInt(options && options.colisage));
  const remark = String(options && options.remark || "").trim();
  if (!(unitsPerBox > 0)) throw new Error("Sortie rapide impossible sans 件/箱.");

  const packsPerBox = computePacksPerBox(unitsPerBox, colisage);
  const wholeBoxes = Math.floor(totalPieces / unitsPerBox);
  const remainderPieces = Math.max(0, totalPieces - (wholeBoxes * unitsPerBox));

  if (!(remainderPieces > 0)) return buildSimpleStateFromPieces(totalPieces, options);

  if (packsPerBox > 0 && colisage > 0 && remainderPieces % colisage === 0) {
    const packCount = remainderPieces / colisage;
    return normalizeStateModel({
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

  if (packsPerBox > 0 && colisage > 0) {
    const packCount = Math.floor(remainderPieces / colisage);
    const loosePieces = remainderPieces - (packCount * colisage);
    return normalizeStateModel({
      tail: 0,
      unitsPerBox: unitsPerBox,
      itemBoxes: wholeBoxes > 0 ? wholeBoxes : 1,
      sign: wholeBoxes > 0 ? "+" : "×",
      fractionText: fractionTextFromPieces(loosePieces || remainderPieces, unitsPerBox),
      fractionValue: (loosePieces || remainderPieces) / unitsPerBox,
      colisage: colisage,
      packNotation: loosePieces > 0 && packCount > 0 ? ("+" + packCount + "包") : "",
      remark: remark
    });
  }

  return buildSimpleStateFromPieces(totalPieces, options);
}

function buildStateFromPieces(totalPiecesInput, options) {
  const reconstructionMode = String(options && options.reconstructionMode || "").trim();
  return reconstructionMode === "packs"
    ? buildPackFriendlyStateFromPieces(totalPiecesInput, options)
    : buildSimpleStateFromPieces(totalPiecesInput, options);
}

function buildTailDisplay(stateInput) {
  const tailBase = Math.max(0, toInt(stateInput && stateInput.tail));
  if (!(tailBase > 0)) return "";
  const tailNotation = getTailNotationFromState(stateInput);
  return "(" + String(tailBase) + "p)" + (tailNotation || "");
}

function buildRawStockDisplay(stateInput) {
  const state = normalizeStateModel(stateInput || {});
  const tailDisplay = buildTailDisplay(state);
  const unitsPerBox = state.unitsPerBox;
  const itemBoxes = state.itemBoxes;
  const sign = state.sign;
  const fractionText = state.fractionText || "";
  const hasMainContent = itemBoxes > 0 || !!fractionText;
  let core = "";

  if (unitsPerBox > 0 && hasMainContent) {
    core = String(unitsPerBox) + "p";
    if (sign === "×" && fractionText) {
      core += itemBoxes > 1 ? ("×" + String(itemBoxes) + "×" + fractionText) : ("×" + fractionText);
    } else if (sign === "+" && fractionText) {
      core += "×" + String(itemBoxes) + "+" + fractionText;
    } else if (itemBoxes > 0) {
      core += "×" + String(itemBoxes);
    }
  }

  if (tailDisplay) return tailDisplay + (core ? "+" + core : "");
  return core || "-";
}

function buildStockDisplay(stateInput) {
  const state = normalizeStateModel(stateInput || {});
  const rawDisplay = buildRawStockDisplay(state);
  const mainPackNotation = getMainPackNotationFromState(state);
  if (!mainPackNotation) return rawDisplay;
  return rawDisplay === "-" ? mainPackNotation : rawDisplay + mainPackNotation;
}

function computeStockStateFromModel(stateInput) {
  return stateModelToPieces(stateInput || {}) > 0 ? "positive" : "zero";
}

function buildPackMeta(stateInput) {
  const state = normalizeStateModel(stateInput || {});
  const packsPerBox = computePacksPerBox(state.unitsPerBox, state.colisage);
  const dynamicFractions = [];
  let packCounterText = "";
  const baseFractions = { "1/2": true, "1/3": true, "1/4": true, "2/3": true };

  if (packsPerBox > 1) {
    for (let i = 1; i < packsPerBox; i++) {
      const value = i + "/" + packsPerBox;
      if (!baseFractions[value]) dynamicFractions.push(value);
    }
  }

  if (packsPerBox > 0) {
    const packMeta = parsePackNotation(getMainPackNotationFromState(state));
    const basePackCount = state.fractionValue > 0 ? (state.fractionValue * packsPerBox) : 0;
    const deltaPackCount = packMeta.count > 0 ? (packMeta.sign === "-" ? -packMeta.count : packMeta.count) : 0;
    if (state.fractionValue > 0 || packMeta.count > 0) {
      const counter = Math.max(0, Math.floor(basePackCount + deltaPackCount));
      packCounterText = counter + "/" + packsPerBox;
    }
  }

  return { packsPerBox: packsPerBox, packCounterText: packCounterText, dynamicFractions: dynamicFractions };
}

function hydrateItem(rawItem) {
  const normalized = normalizeStateModel(rawItem || {});
  const packMeta = buildPackMeta(normalized);
  return Object.assign({}, rawItem, normalized, packMeta, {
    reference: normalizeReference(rawItem.reference),
    stockDisplay: buildStockDisplay(normalized),
    stockState: computeStockStateFromModel(normalized)
  });
}

function formatDateLabel(isoText) {
  if (!isoText) return "--/--/----";
  const date = new Date(isoText);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }
  return String(isoText || "").trim() || "--/--/----";
}

function formatHistoryTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return String(value || "").trim();
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date).replace(",", "");
}

function getActionBadgeClass(actionType) {
  if (actionType === "exit") return "bg-error-container/25 text-on-error-container";
  if (actionType === "entry") return "bg-primary-container text-on-primary-container";
  if (actionType === "adjustment") return "bg-surface-container-high text-on-surface-variant";
  return "bg-surface-container-high text-on-surface-variant";
}

function getActionLabel(actionType) {
  if (actionType === "entry") return "entrée";
  if (actionType === "exit") return "sortie";
  if (actionType === "adjustment") return "ajustement";
  return actionType || "-";
}

function summarizeDetailItem(item) {
  if (!item) return "-";
  const parts = [];
  if (toInt(item.tail) > 0) parts.push("尾箱 " + toInt(item.tail));
  if (toInt(item.unitsPerBox) > 0) parts.push("件/箱 " + toInt(item.unitsPerBox));
  if (toInt(item.itemBoxes) > 0) parts.push("箱数 " + toInt(item.itemBoxes));
  if (item.fractionText) parts.push("分数 " + item.fractionText);
  if (getMainPackNotationFromState(item)) parts.push(getMainPackNotationFromState(item));
  return parts.join(" · ") || item.stockDisplay || "-";
}

function buildHistoryEntryFromLocalChange(actionType, beforeItem, afterItem, remark) {
  const timestampRaw = new Date().toISOString();
  return {
    id: "local-his-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    timestampRaw: timestampRaw,
    timestampLabel: formatHistoryTimestamp(timestampRaw),
    actionType: actionType,
    reference: afterItem.reference,
    rowId: afterItem.id,
    beforeDisplay: beforeItem.stockDisplay || "",
    afterDisplay: afterItem.stockDisplay || "",
    remark: String(remark || "").trim(),
    source: "stock_mobile_quick_edit",
    beforeTotalPieces: stateModelToPieces(beforeItem),
    afterTotalPieces: stateModelToPieces(afterItem)
  };
}

function saveState() {
  const payload = {
    items: state.items,
    historyItems: state.historyItems
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.items = seedItems.map(hydrateItem);
    state.historyItems = seedHistory.slice();
    saveState();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.items = (Array.isArray(parsed.items) ? parsed.items : seedItems).map(hydrateItem);
    state.historyItems = Array.isArray(parsed.historyItems) ? parsed.historyItems.slice() : seedHistory.slice();
  } catch (_error) {
    state.items = seedItems.map(hydrateItem);
    state.historyItems = seedHistory.slice();
    saveState();
  }
}

function getInventoryByReference(reference) {
  const normalized = normalizeReference(reference);
  return state.items.find(function(item) {
    return item.reference === normalized;
  }) || null;
}

function getItemById(id) {
  return state.items.find(function(item) {
    return item.id === id;
  }) || null;
}

function getHistoryForReference(reference) {
  const normalized = normalizeReference(reference);
  return state.historyItems
    .filter(function(entry) {
      return normalizeReference(entry.reference) === normalized;
    })
    .sort(function(a, b) {
      return new Date(b.timestampRaw) - new Date(a.timestampRaw);
    });
}

function sortItems(items) {
  return items.slice().sort(function(a, b) {
    const leftSortKey = String(a && a.sortKey ? a.sortKey : "").trim();
    const rightSortKey = String(b && b.sortKey ? b.sortKey : "").trim();
    if (leftSortKey && rightSortKey && leftSortKey !== rightSortKey) return leftSortKey.localeCompare(rightSortKey);
    if (leftSortKey && !rightSortKey) return -1;
    if (!leftSortKey && rightSortKey) return 1;
    return String(a.reference || "").localeCompare(String(b.reference || ""));
  });
}

function filterInventoryItems(query) {
  const normalizedQuery = normalizeText(query);
  const filtered = state.items.filter(function(item) {
    if (!normalizedQuery) return true;
    const haystack = normalizeText([item.reference, item.warehouse, item.stockDisplay, item.remark].join(" "));
    return haystack.indexOf(normalizedQuery) !== -1;
  });
  return sortItems(filtered);
}

function filterHistoryItems(query, actionType) {
  const normalizedQuery = normalizeText(query);
  return state.historyItems
    .filter(function(entry) {
      if (actionType && entry.actionType !== actionType) return false;
      if (!normalizedQuery) return true;
      const haystack = normalizeText([
        entry.reference,
        entry.actionType,
        entry.remark,
        entry.source,
        entry.beforeDisplay,
        entry.afterDisplay
      ].join(" "));
      return haystack.indexOf(normalizedQuery) !== -1;
    })
    .sort(function(a, b) {
      return new Date(b.timestampRaw) - new Date(a.timestampRaw);
    });
}

function getInventorySummary(items) {
  const positiveCount = items.filter(function(item) {
    return item.stockState === "positive";
  }).length;
  const totalPieces = items.reduce(function(sum, item) {
    return sum + stateModelToPieces(item);
  }, 0);
  const totalBoxes = items.reduce(function(sum, item) {
    return sum + Math.max(0, toInt(item.itemBoxes));
  }, 0);
  return {
    visibleCount: items.length,
    positiveCount: positiveCount,
    zeroCount: Math.max(0, items.length - positiveCount),
    totalPieces: totalPieces,
    totalBoxes: totalBoxes
  };
}

function getColumnCount() {
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const isLandscape = width > (window.innerHeight || 0);
  if (width >= 980) return 4;
  if (width >= 720 || (isLandscape && width >= 560)) return 3;
  return 2;
}

function buildColumnLayout_(items, columnCount) {
  const normalizedCount = Math.max(1, Math.trunc(Number(columnCount) || 1));
  if (!items.length) return [];
  const itemsPerColumn = Math.ceil(items.length / normalizedCount);
  const columns = [];
  for (let i = 0; i < normalizedCount; i++) {
    const start = i * itemsPerColumn;
    const slice = items.slice(start, start + itemsPerColumn);
    if (slice.length) columns.push(slice);
  }
  return columns;
}

function renderInventoryCard(item) {
  const reference = item.reference || "-";
  const itemId = item.id || reference;
  const stockDisplay = item.stockDisplay || "-";
  const accentClass = item.stockState === "positive" ? "border-emerald-400/50" : "border-rose-400/50";
  const stockClass = item.stockState === "positive" ? "text-primary" : "text-on-surface-variant";

  return ''
    + '<article class="inventory-card bg-surface-container-lowest relative border-l-4 ' + accentClass + ' flex min-h-[4.1rem] items-stretch transition-colors duration-150 hover:bg-surface-container select-none" data-item-id="' + escapeHtml(itemId) + '" data-reference="' + escapeHtml(reference) + '" data-stock-display="' + escapeHtml(stockDisplay) + '" data-stock-state="' + escapeHtml(item.stockState) + '">'
    + '<button class="inventory-card-main flex min-w-0 flex-1 flex-col justify-between px-2.5 py-2 text-left" type="button" data-action="open-quick-edit" data-item-id="' + escapeHtml(itemId) + '">'
    + '<div class="flex items-start gap-2">'
    + '<span class="truncate pr-2 text-[12px] font-bold tracking-tight text-on-surface">' + escapeHtml(reference) + '</span>'
    + '</div>'
    + '<div class="mt-1.5 flex items-end justify-between gap-2">'
    + '<div class="min-w-0">'
    + '<span class="block truncate text-[13px] font-medium ' + stockClass + '">' + escapeHtml(stockDisplay) + '</span>'
    + '<span class="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Entrepot ' + escapeHtml(item.warehouse || "-") + '</span>'
    + '</div>'
    + '</div>'
    + '</button>'
    + '<a class="reference-detail-trigger flex w-10 shrink-0 touch-manipulation select-none items-center justify-center border-l border-outline-variant/20 text-outline-variant transition-colors duration-150 hover:bg-surface-container-highest hover:text-on-surface-variant active:bg-surface-container-high" href="./detail.html?ref=' + encodeURIComponent(reference) + '" aria-label="Ouvrir la fiche de ' + escapeHtml(reference) + '">'
    + '<span class="material-symbols-outlined !text-[16px]">chevron_right</span>'
    + '</a>'
    + '</article>';
}

function renderColumnLayoutMarkup(columns) {
  if (!columns.length) return "";
  return '<div class="flex items-start gap-px bg-outline-variant/20">' + columns.map(function(columnItems) {
    return '<div class="inventory-column flex min-w-0 flex-1 flex-col gap-px bg-outline-variant/20">' + columnItems.map(renderInventoryCard).join("") + '</div>';
  }).join("") + '</div>';
}

function renderHistoryCard(entry) {
  return ''
    + '<article class="bg-surface-container-lowest px-4 py-3 shadow-ledger" data-history-reference="' + escapeHtml(entry.reference) + '">'
    + '<div class="flex items-start justify-between gap-3">'
    + '<div class="min-w-0">'
    + '<a class="truncate text-left text-[12px] font-bold tracking-tight text-primary" href="./detail.html?ref=' + encodeURIComponent(entry.reference) + '">' + escapeHtml(entry.reference || "-") + '</a>'
    + '<div class="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">' + escapeHtml(entry.timestampLabel || formatHistoryTimestamp(entry.timestampRaw)) + '</div>'
    + '</div>'
    + '<span class="shrink-0 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ' + getActionBadgeClass(entry.actionType) + '">' + escapeHtml(getActionLabel(entry.actionType)) + '</span>'
    + '</div>'
    + '<div class="mt-3 space-y-1">'
    + '<div class="text-[11px] text-on-surface"><span class="font-bold uppercase tracking-[0.14em] text-on-surface-variant">AVANT</span><span class="ml-2">' + escapeHtml(entry.beforeDisplay || "-") + '</span></div>'
    + '<div class="text-[11px] text-on-surface"><span class="font-bold uppercase tracking-[0.14em] text-on-surface-variant">APRÈS</span><span class="ml-2">' + escapeHtml(entry.afterDisplay || "-") + '</span></div>'
    + (entry.remark ? '<div class="text-[11px] text-on-surface-variant">' + escapeHtml(entry.remark) + '</div>' : '')
    + '</div>'
    + '</article>';
}

function renderDetailHistoryCard(entry) {
  return ''
    + '<article class="bg-surface-container-lowest px-4 py-3 shadow-ledger">'
    + '<div class="flex items-start justify-between gap-3">'
    + '<div class="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">' + escapeHtml(entry.timestampLabel || formatHistoryTimestamp(entry.timestampRaw)) + '</div>'
    + '<div class="flex items-center gap-2">'
    + '<span class="shrink-0 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ' + getActionBadgeClass(entry.actionType) + '">' + escapeHtml(getActionLabel(entry.actionType)) + '</span>'
    + '</div>'
    + '</div>'
    + '<div class="mt-2 space-y-1">'
    + '<div class="text-[11px] text-on-surface"><span class="font-bold uppercase tracking-[0.14em] text-on-surface-variant">AVANT</span><span class="ml-2">' + escapeHtml(entry.beforeDisplay || "-") + '</span></div>'
    + '<div class="text-[11px] text-on-surface"><span class="font-bold uppercase tracking-[0.14em] text-on-surface-variant">APRÈS</span><span class="ml-2">' + escapeHtml(entry.afterDisplay || "-") + '</span></div>'
    + (entry.remark ? '<div class="text-[11px] text-on-surface-variant">' + escapeHtml(entry.remark) + '</div>' : '')
    + '</div>'
    + '</article>';
}

function getQuickEditElements() {
  return {
    overlay: document.getElementById("quickEditOverlay"),
    reference: document.getElementById("quickEditReference"),
    stockDisplay: document.getElementById("quickEditStockDisplay"),
    tabQuickExit: document.getElementById("quickEditTabQuickExit"),
    tabEdit: document.getElementById("quickEditTabEdit"),
    quickExitPanel: document.getElementById("quickExitPanel"),
    quickExitCurrentStock: document.getElementById("quickExitCurrentStock"),
    quickExitMode: document.getElementById("quickExitMode"),
    quickExitValue: document.getElementById("quickExitValue"),
    quickExitFractionText: document.getElementById("quickExitFractionText"),
    quickExitFractionWrap: document.getElementById("quickExitFractionWrap"),
    form: document.getElementById("quickEditForm"),
    tail: document.getElementById("quickEditTail"),
    unitsPerBox: document.getElementById("quickEditUnitsPerBox"),
    itemBoxes: document.getElementById("quickEditItemBoxes"),
    sign: document.getElementById("quickEditSign"),
    fractionText: document.getElementById("quickEditFractionText"),
    packNotationSign: document.getElementById("quickEditPackNotationSign"),
    packNotationCount: document.getElementById("quickEditPackNotationCount"),
    remark: document.getElementById("quickEditRemark"),
    message: document.getElementById("quickEditMessage"),
    cancel: document.getElementById("quickEditCancel"),
    save: document.getElementById("quickEditSave")
  };
}

function syncQuickEditTabs(els) {
  const isQuickExit = state.quickEditTab === "quick-exit";
  els.quickExitPanel.classList.toggle("hidden", !isQuickExit);
  els.form.classList.toggle("hidden", isQuickExit);
  els.tabQuickExit.className = "border border-outline-variant/30 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] " + (isQuickExit ? "bg-surface-tint text-on-primary" : "text-on-surface-variant");
  els.tabEdit.className = "border border-outline-variant/30 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] " + (!isQuickExit ? "bg-surface-tint text-on-primary" : "text-on-surface-variant");
  els.quickExitFractionWrap.classList.toggle("hidden", els.quickExitMode.value !== "fraction");
}

function openQuickEdit(item) {
  if (!item) return;
  state.quickEditOpen = true;
  state.quickEditItemId = item.id;
  state.quickEditTab = "quick-exit";
  state.quickEditForm = {
    tail: item.tail,
    unitsPerBox: item.unitsPerBox,
    itemBoxes: item.itemBoxes,
    sign: item.sign,
    fractionText: item.fractionText,
    packNotationSign: parsePackNotation(getMainPackNotationFromState(item)).sign,
    packNotationCount: parsePackNotation(getMainPackNotationFromState(item)).count,
    remark: item.remark
  };
  state.quickExitForm = {
    exitMode: item.colisage > 0 ? "packs" : "boxes",
    exitValue: "",
    exitFractionText: "",
    remark: item.remark
  };
  renderQuickEdit();
}

function closeQuickEdit() {
  state.quickEditOpen = false;
  state.quickEditItemId = "";
  const els = getQuickEditElements();
  if (els.overlay) {
    els.overlay.classList.add("hidden");
    els.overlay.classList.remove("flex");
  }
}

function renderQuickEdit() {
  const els = getQuickEditElements();
  if (!els.overlay) return;
  if (!state.quickEditOpen) {
    closeQuickEdit();
    return;
  }

  const item = getItemById(state.quickEditItemId);
  if (!item) {
    closeQuickEdit();
    return;
  }

  els.overlay.classList.remove("hidden");
  els.overlay.classList.add("flex");
  els.reference.textContent = item.reference;
  els.stockDisplay.textContent = item.stockDisplay;
  els.quickExitCurrentStock.textContent = item.stockDisplay;
  els.quickExitMode.value = state.quickExitForm.exitMode;
  els.quickExitValue.value = state.quickExitForm.exitValue;
  els.quickExitFractionText.value = state.quickExitForm.exitFractionText;
  els.tail.value = state.quickEditForm.tail;
  els.unitsPerBox.value = state.quickEditForm.unitsPerBox;
  els.itemBoxes.value = state.quickEditForm.itemBoxes;
  els.sign.value = state.quickEditForm.sign;
  els.fractionText.value = state.quickEditForm.fractionText;
  els.packNotationSign.value = state.quickEditForm.packNotationSign;
  els.packNotationCount.value = state.quickEditForm.packNotationCount;
  els.remark.value = state.quickEditTab === "quick-exit" ? state.quickExitForm.remark : state.quickEditForm.remark;
  els.message.classList.add("hidden");
  els.message.textContent = "";

  if (state.quickExitForm.exitMode === "packs" && !(item.colisage > 0)) {
    state.quickExitForm.exitMode = "boxes";
    els.quickExitMode.value = "boxes";
  }

  syncQuickEditTabs(els);
}

function replaceItem(nextItem) {
  state.items = state.items.map(function(item) {
    return item.id === nextItem.id ? nextItem : item;
  });
}

function buildEditStateFromInput(payload, currentItem) {
  const nextState = normalizeStateModel({
    tail: Math.max(0, toInt(payload.tail)),
    unitsPerBox: Math.max(0, toInt(payload.unitsPerBox)),
    itemBoxes: Math.max(0, toInt(payload.itemBoxes)),
    sign: normalizeSign(payload.sign),
    fractionText: normalizeFractionText(payload.fractionText),
    fractionValue: parseFractionValue(payload.fractionText),
    colisage: currentItem.colisage,
    packNotation: buildPackNotationFromParts(payload.packNotationSign, payload.packNotationCount, currentItem.packNotation),
    remark: String(payload.remark || "").trim()
  });
  return nextState;
}

function buildQuickExitStateFromInput(payload, currentItem) {
  const currentState = normalizeStateModel(currentItem);
  const unitsPerBox = currentState.unitsPerBox;
  const totalPieces = stateModelToPieces(currentState);
  const exitMode = String(payload.exitMode || "").trim();
  const exitValue = Math.max(0, toInt(payload.exitValue));
  const exitFractionText = normalizeFractionText(payload.exitFractionText);
  let exitPieces = 0;

  if (unitsPerBox <= 0) throw new Error("Sortie rapide impossible sans 件/箱.");
  if (exitMode === "boxes") {
    if (!(exitValue > 0)) throw new Error("Indique un nombre de cartons positif.");
    exitPieces = unitsPerBox * exitValue;
  } else if (exitMode === "fraction") {
    const fractionValue = parseFractionValue(exitFractionText);
    if (!(fractionValue > 0) || !exitFractionText) throw new Error("Selectionne une fraction valide.");
    exitPieces = unitsPerBox * fractionValue;
  } else if (exitMode === "packs") {
    const colisage = parsePositiveNumber(currentItem.colisage);
    if (!(colisage > 0)) throw new Error("Mode paquets indisponible pour cette reference.");
    if (!(exitValue > 0)) throw new Error("Indique un nombre de paquets positif.");
    exitPieces = colisage * exitValue;
  } else {
    throw new Error("Mode de sortie invalide.");
  }

  const newTotal = totalPieces - exitPieces;
  if (newTotal < 0) throw new Error("La sortie depasse le stock disponible.");

  return buildStateFromPieces(newTotal, {
    unitsPerBox: unitsPerBox,
    colisage: currentItem.colisage,
    remark: String(payload.remark || "").trim(),
    reconstructionMode: exitMode
  });
}

function saveQuickEdit() {
  const els = getQuickEditElements();
  const currentItem = getItemById(state.quickEditItemId);
  if (!currentItem) return;

  try {
    const nextState = state.quickEditTab === "edit"
      ? buildEditStateFromInput({
          tail: els.tail.value,
          unitsPerBox: els.unitsPerBox.value,
          itemBoxes: els.itemBoxes.value,
          sign: els.sign.value,
          fractionText: els.fractionText.value,
          packNotationSign: els.packNotationSign.value,
          packNotationCount: els.packNotationCount.value,
          remark: els.remark.value
        }, currentItem)
      : buildQuickExitStateFromInput({
          exitMode: els.quickExitMode.value,
          exitValue: els.quickExitValue.value,
          exitFractionText: els.quickExitFractionText.value,
          remark: els.remark.value
        }, currentItem);

    const nextItem = hydrateItem(Object.assign({}, currentItem, nextState));
    const historyEntry = buildHistoryEntryFromLocalChange(
      state.quickEditTab === "edit" ? "adjustment" : "exit",
      currentItem,
      nextItem,
      nextState.remark
    );

    replaceItem(nextItem);
    state.historyItems = [historyEntry].concat(state.historyItems);
    saveState();
    closeQuickEdit();
    renderAll();
  } catch (error) {
    els.message.textContent = error && error.message ? error.message : "Erreur quick edit";
    els.message.classList.remove("hidden");
  }
}

function bindQuickEditEvents() {
  const els = getQuickEditElements();
  if (!els.overlay) return;
  els.tabQuickExit.addEventListener("click", function() {
    state.quickEditTab = "quick-exit";
    renderQuickEdit();
  });
  els.tabEdit.addEventListener("click", function() {
    state.quickEditTab = "edit";
    renderQuickEdit();
  });
  els.quickExitMode.addEventListener("change", function() {
    state.quickExitForm.exitMode = els.quickExitMode.value;
    renderQuickEdit();
  });
  els.cancel.addEventListener("click", closeQuickEdit);
  els.save.addEventListener("click", saveQuickEdit);
  els.overlay.addEventListener("click", function(event) {
    if (event.target === els.overlay) closeQuickEdit();
  });
  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && state.quickEditOpen) closeQuickEdit();
  });
}

function renderInventoryPage() {
  const searchInput = document.getElementById("searchInput");
  const networkStatus = document.getElementById("networkStatus");
  const refreshButton = document.getElementById("refreshButton");
  const summaryDate = document.getElementById("summaryDate");
  const summaryRefs = document.getElementById("summaryRefs");
  const summaryPositive = document.getElementById("summaryPositive");
  const summaryZero = document.getElementById("summaryZero");
  const summaryTotals = document.getElementById("summaryTotals");
  const summaryStatus = document.getElementById("summaryStatus");
  const inventoryGrid = document.getElementById("inventoryGrid");
  const emptyState = document.getElementById("emptyState");
  if (!searchInput || !inventoryGrid) return;

  searchInput.value = state.query;
  const items = filterInventoryItems(state.query);
  const columns = buildColumnLayout_(items, state.columnCount);
  const summary = getInventorySummary(items);
  inventoryGrid.innerHTML = renderColumnLayoutMarkup(columns);
  emptyState.classList.toggle("hidden", items.length > 0);
  summaryDate.textContent = formatDateLabel(new Date().toISOString());
  summaryRefs.textContent = summary.visibleCount + " refs";
  summaryPositive.textContent = summary.positiveCount + " en stock";
  summaryZero.textContent = summary.zeroCount + " en rupture";
  summaryTotals.textContent = summary.totalBoxes + " 箱 " + summary.totalPieces + " 件";
  if (networkStatus) networkStatus.textContent = navigator.onLine ? "En ligne" : "Hors ligne";
  summaryStatus.textContent = state.query ? "Recherche" : "Pret";
  if (refreshButton && !refreshButton.dataset.bound) {
    refreshButton.dataset.bound = "true";
    refreshButton.addEventListener("click", function() {
      renderInventoryPage();
    });
  }
}

function renderHistoryPage() {
  const searchInput = document.getElementById("historySearchInput");
  const actionTypeFilter = document.getElementById("historyActionTypeFilter");
  const historyRefreshButton = document.getElementById("historyRefreshButton");
  const historyStatus = document.getElementById("historyStatus");
  const historyList = document.getElementById("historyList");
  const historyEmptyState = document.getElementById("historyEmptyState");
  const historyEmptyTitle = document.getElementById("historyEmptyTitle");
  const historyEmptyMessage = document.getElementById("historyEmptyMessage");
  if (!searchInput || !historyList) return;

  searchInput.value = state.historyQuery;
  actionTypeFilter.value = state.historyActionType;
  const items = filterHistoryItems(state.historyQuery, state.historyActionType);
  const hasFilters = !!(state.historyQuery || state.historyActionType);
  historyList.innerHTML = items.map(renderHistoryCard).join("");
  historyStatus.textContent = hasFilters ? "Filtré" : "Pret";
  historyEmptyState.classList.toggle("hidden", items.length > 0);
  historyEmptyTitle.textContent = hasFilters ? "Aucun resultat" : "Aucun historique";
  historyEmptyMessage.textContent = hasFilters ? "Aucun mouvement ne correspond à la recherche." : "Aucun mouvement à afficher.";
  if (historyRefreshButton && !historyRefreshButton.dataset.bound) {
    historyRefreshButton.dataset.bound = "true";
    historyRefreshButton.addEventListener("click", function() {
      renderHistoryPage();
    });
  }
}

function renderDetailPage() {
  const detailReference = document.getElementById("detailReference");
  const detailSubline = document.getElementById("detailSubline");
  const detailNotFoundBanner = document.getElementById("detailNotFoundBanner");
  const detailMainSection = document.getElementById("detailMainSection");
  const detailStockDisplay = document.getElementById("detailStockDisplay");
  const detailStockState = document.getElementById("detailStockState");
  const detailWarehouse = document.getElementById("detailWarehouse");
  const detailCreatedAt = document.getElementById("detailCreatedAt");
  const detailLastMovement = document.getElementById("detailLastMovement");
  const detailSummary = document.getElementById("detailSummary");
  const detailRemarkSection = document.getElementById("detailRemarkSection");
  const detailRemark = document.getElementById("detailRemark");
  const detailHistoryList = document.getElementById("detailHistoryList");
  const detailHistoryEmpty = document.getElementById("detailHistoryEmpty");
  const detailQuickEditButton = document.getElementById("detailQuickEditButton");
  if (!detailReference) return;

  const reference = state.detailReference || getParam("ref");
  state.detailReference = reference;
  const item = getInventoryByReference(reference);
  if (!item) {
    detailReference.textContent = reference || "-";
    detailSubline.textContent = "Fiche produit";
    detailNotFoundBanner.classList.remove("hidden");
    detailMainSection.classList.add("hidden");
    detailRemarkSection.classList.add("hidden");
    detailHistoryList.innerHTML = "";
    detailHistoryEmpty.classList.remove("hidden");
    if (detailQuickEditButton) detailQuickEditButton.classList.add("hidden");
    return;
  }

  const itemHistory = getHistoryForReference(item.reference);
  detailReference.textContent = item.reference;
  detailSubline.textContent = "Fiche produit";
  detailStockDisplay.textContent = item.stockDisplay || "-";
  detailStockState.textContent = item.stockState === "positive" ? "En stock" : "En rupture";
  detailWarehouse.textContent = item.warehouse || "-";
  detailCreatedAt.textContent = item.createdAt || "-";
  detailLastMovement.textContent = itemHistory.length ? (itemHistory[0].timestampLabel || formatHistoryTimestamp(itemHistory[0].timestampRaw)) : "-";
  detailSummary.textContent = summarizeDetailItem(item);
  detailNotFoundBanner.classList.add("hidden");
  detailMainSection.classList.remove("hidden");
  if (detailQuickEditButton) detailQuickEditButton.classList.remove("hidden");

  if (item.remark) {
    detailRemarkSection.classList.remove("hidden");
    detailRemark.textContent = item.remark;
  } else {
    detailRemarkSection.classList.add("hidden");
  }

  detailHistoryList.innerHTML = itemHistory.map(renderDetailHistoryCard).join("");
  detailHistoryEmpty.classList.toggle("hidden", itemHistory.length > 0);
}

function renderAll() {
  renderInventoryPage();
  renderHistoryPage();
  renderDetailPage();
  if (state.quickEditOpen) renderQuickEdit();
}

function syncColumnLayout(force) {
  const nextCount = getColumnCount();
  if (!force && nextCount === state.columnCount) return;
  state.columnCount = nextCount;
  renderInventoryPage();
}

function bindInventoryEvents() {
  const searchInput = document.getElementById("searchInput");
  const inventoryGrid = document.getElementById("inventoryGrid");
  if (!searchInput || !inventoryGrid) return;
  searchInput.addEventListener("input", function(event) {
    state.query = String(event.target.value || "").trim();
    renderInventoryPage();
  });
  inventoryGrid.addEventListener("click", function(event) {
    const trigger = event.target.closest('[data-action="open-quick-edit"]');
    if (!trigger) return;
    openQuickEdit(getItemById(trigger.getAttribute("data-item-id")));
  });
}

function bindHistoryEvents() {
  const searchInput = document.getElementById("historySearchInput");
  const actionTypeFilter = document.getElementById("historyActionTypeFilter");
  if (!searchInput || !actionTypeFilter) return;
  searchInput.addEventListener("input", function(event) {
    state.historyQuery = String(event.target.value || "").trim();
    renderHistoryPage();
  });
  actionTypeFilter.addEventListener("change", function(event) {
    state.historyActionType = String(event.target.value || "").trim();
    renderHistoryPage();
  });
}

function bindDetailEvents() {
  const detailBackButton = document.getElementById("detailBackButton");
  const detailQuickEditButton = document.getElementById("detailQuickEditButton");
  if (detailBackButton) {
    detailBackButton.addEventListener("click", function() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "./index.html";
      }
    });
  }
  if (detailQuickEditButton) {
    detailQuickEditButton.addEventListener("click", function() {
      const item = getInventoryByReference(state.detailReference || getParam("ref"));
      if (item) openQuickEdit(item);
    });
  }
}

function initApp() {
  loadState();
  state.columnCount = getColumnCount();
  state.currentView = getCurrentPage();
  state.detailReference = getParam("ref");
  bindInventoryEvents();
  bindHistoryEvents();
  bindDetailEvents();
  bindQuickEditEvents();
  renderAll();

  let resizeTimer = 0;
  window.addEventListener("resize", function() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function() {
      syncColumnLayout(false);
    }, 100);
  });
  window.addEventListener("online", renderAll);
  window.addEventListener("offline", renderAll);
}

document.addEventListener("DOMContentLoaded", initApp);
