let dataSource = null;
let remoteDataSource = null;
let remoteRefreshPromise = null;
let remoteDetailRefreshReference = "";
let remoteMutationSyncPromise = null;
let hasLocalWritesThisSession = false;

const state = {
  items: [],
  historyItems: [],
  pendingMutations: [],
  syncStatus: "idle",
  lastSyncAt: "",
  dataSource: "local",
  query: "",
  inventoryStockFilter: "",
  inventorySort: "reference",
  historyQuery: "",
  historyActionType: "",
  historyPeriod: "all",
  columnCount: 2,
  currentView: "inventory",
  previousView: "inventory",
  detailReference: "",
  quickEditOpen: false,
  quickEditTab: "quick-exit",
  quickEditItemId: "",
  quickEditItem: null,
  quickEditTailOpen: false,
  quickEditPartialOpen: false,
  quickExitClearSelected: false,
  quickExitSegmentErrors: {},
  quickEditError: "",
  quickEditSaving: false,
  quickEditForm: null,
  quickExitForm: null
};

function applyDataMeta(meta) {
  state.pendingMutations = meta && Array.isArray(meta.pendingMutations) ? meta.pendingMutations : [];
  state.syncStatus = meta && meta.syncStatus ? meta.syncStatus : "idle";
  state.lastSyncAt = meta && typeof meta.lastSyncAt === "string" ? meta.lastSyncAt : "";
  state.dataSource = meta && meta.dataSource ? meta.dataSource : "local";
}

function isRemoteReadAllowed(options) {
  if (!remoteDataSource || !remoteDataSource.isConfigured || !remoteDataSource.isConfigured()) return false;
  if (!navigator.onLine) return false;
  return !(options && options.disabled);
}

function getSyncStatusLabel(defaultLabel) {
  if (state.syncStatus === "refreshing") return "Refresh...";
  if (state.syncStatus === "offline") return "Hors ligne";
  if (state.syncStatus === "error") return "Erreur";
  return defaultLabel;
}

function refreshRemoteSnapshot(options) {
  if (!isRemoteReadAllowed(options)) {
    if (navigator.onLine === false) state.syncStatus = "offline";
    return Promise.resolve(false);
  }
  if (remoteRefreshPromise) return remoteRefreshPromise;

  state.syncStatus = "refreshing";
  renderAll();

  remoteRefreshPromise = Promise.all([
    remoteDataSource.fetchInventory(),
    remoteDataSource.fetchHistory()
  ]).then(function(results) {
    const inventoryPayload = results[0];
    const historyPayload = results[1];
    const pendingCount = state.pendingMutations.length;
    const snapshotResult = dataSource.mergeRemoteSnapshot({
      items: inventoryPayload.items,
      historyItems: historyPayload.items,
      syncStatus: "idle",
      lastSyncAt: inventoryPayload.generatedAt || historyPayload.generatedAt || new Date().toISOString(),
      dataSource: pendingCount ? "remote-with-pending" : "remote-cache"
    });
    state.items = Array.isArray(snapshotResult.items) ? snapshotResult.items : state.items;
    state.historyItems = Array.isArray(snapshotResult.historyItems) ? snapshotResult.historyItems : state.historyItems;
    applyDataMeta(snapshotResult.meta);
    renderAll();
    return true;
  }).catch(function(error) {
    console.warn("Remote read-only refresh failed", error);
    state.syncStatus = navigator.onLine ? "error" : "offline";
    renderAll();
    return false;
  }).finally(function() {
    remoteRefreshPromise = null;
  });

  return remoteRefreshPromise;
}

function refreshRemoteDetail(reference, options) {
  const normalizedReference = normalizeReference(reference);
  if (!normalizedReference) return Promise.resolve(false);
  if (!isRemoteReadAllowed(options)) return Promise.resolve(false);
  if (remoteDetailRefreshReference === normalizedReference) return Promise.resolve(false);

  remoteDetailRefreshReference = normalizedReference;
  if (!options || !options.silent) {
    state.syncStatus = "refreshing";
    renderAll();
  }

  return remoteDataSource.fetchDetail(normalizedReference).then(function(payload) {
    const snapshotResult = dataSource.mergeRemoteSnapshot({
      reference: normalizedReference,
      item: payload.item,
      history: payload.history,
      syncStatus: "idle",
      lastSyncAt: payload.generatedAt || state.lastSyncAt,
      dataSource: state.pendingMutations.length ? "remote-with-pending" : "remote-cache"
    });
    state.items = Array.isArray(snapshotResult.items) ? snapshotResult.items : state.items;
    state.historyItems = Array.isArray(snapshotResult.historyItems) ? snapshotResult.historyItems : state.historyItems;
    applyDataMeta(snapshotResult.meta);
    renderAll();
    return true;
  }).catch(function(error) {
    console.warn("Remote detail refresh failed", error);
    if (!options || !options.silent) {
      state.syncStatus = navigator.onLine ? "error" : "offline";
      renderAll();
    }
    return false;
  }).finally(function() {
    remoteDetailRefreshReference = "";
  });
}

function syncPendingMutations(options) {
  if (remoteMutationSyncPromise) return remoteMutationSyncPromise;
  if (!remoteDataSource || !remoteDataSource.pushMutation) return Promise.resolve(false);
  if (!navigator.onLine) {
    state.syncStatus = "offline";
    renderAll();
    return Promise.resolve(false);
  }
  if (!state.pendingMutations.length) return Promise.resolve(false);

  state.syncStatus = "refreshing";
  if (!options || !options.silent) renderAll();

  remoteMutationSyncPromise = Promise.resolve().then(function syncNext() {
    const mutation = state.pendingMutations[0];
    if (!mutation) {
      return refreshRemoteSnapshot({ silent: true }).then(function() {
        state.syncStatus = "idle";
        renderAll();
        return true;
      });
    }

    return remoteDataSource.pushMutation(mutation).then(function(result) {
      const committed = dataSource.commitSyncedMutation({
        mutationId: mutation.id,
        item: result.item,
        historyEntry: result.historyEntry,
        syncStatus: "idle",
        lastSyncAt: result.generatedAt || new Date().toISOString(),
        dataSource: state.pendingMutations.length > 1 ? "remote-with-pending" : "remote-cache"
      });
      state.items = Array.isArray(committed.items) ? committed.items : state.items;
      state.historyItems = Array.isArray(committed.historyItems) ? committed.historyItems : state.historyItems;
      applyDataMeta(committed.meta);
      renderAll();
      return refreshRemoteSnapshot({ silent: true }).then(syncNext);
    });
  }).catch(function(error) {
    console.warn("Remote mutation sync failed", error);
    state.syncStatus = navigator.onLine ? "error" : "offline";
    renderAll();
    return false;
  }).finally(function() {
    remoteMutationSyncPromise = null;
  });

  return remoteMutationSyncPromise;
}

function getCurrentPage() {
  return document.body ? document.body.dataset.page || "" : "";
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function parseCurrentRoute() {
  const hash = String(window.location.hash || "").replace(/^#\/?/, "").trim();
  if (!hash) {
    const queryReference = getParam("ref");
    return queryReference ? { view: "detail", ref: normalizeReference(queryReference) } : { view: "inventory", ref: "" };
  }
  if (hash === "inventory") return { view: "inventory", ref: "" };
  if (hash === "history") return { view: "history", ref: "" };
  if (hash.indexOf("detail/") === 0) {
    return { view: "detail", ref: normalizeReference(decodeURIComponent(hash.slice("detail/".length))) };
  }
  return { view: "inventory", ref: "" };
}

function buildHashRoute(view, ref) {
  if (view === "history") return "#history";
  if (view === "detail" && ref) return "#detail/" + encodeURIComponent(normalizeReference(ref));
  return "#inventory";
}

function navigateTo(view, options) {
  const nextHash = buildHashRoute(view, options && options.ref);
  if (window.location.hash === nextHash) {
    handleRouteChange();
    return;
  }
  window.location.hash = nextHash;
}

function handleRouteChange() {
  const route = parseCurrentRoute();
  if (route.view === "detail") {
    state.previousView = state.currentView === "history" ? "history" : "inventory";
  } else {
    state.previousView = route.view;
  }
  state.currentView = route.view;
  state.detailReference = route.ref;
  syncActiveShell();
  renderAll();
  if (route.view === "detail" && route.ref) {
    refreshRemoteDetail(route.ref, { silent: true });
  }
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

function sanitizeIntegerInput(value) {
  const match = String(value == null ? "" : value).replace(/[^\d]/g, "");
  return match ? String(Math.max(0, Math.trunc(Number(match) || 0))) : "";
}

function sanitizeSign(value) {
  return normalizeSign(value);
}

function sanitizeFractionText(value) {
  return normalizeFractionText(value);
}

function isFractionTextValid(value) {
  const normalized = sanitizeFractionText(value);
  if (!normalized) return true;
  const match = normalized.match(/^(\d+)\/(\d+)$/);
  if (!match) return false;
  return Number(match[1]) > 0 && Number(match[2]) > 0;
}

function formatTailDisplay(value) {
  const safeValue = Math.max(0, toInt(value));
  return safeValue > 0 ? "(" + safeValue + "p)" : "";
}

function formatUnitsPerBoxDisplay(value) {
  const safeValue = Math.max(0, toInt(value));
  return safeValue > 0 ? (safeValue + "p") : "";
}

function parseStyledIntegerInput(value, options) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return { valid: true, value: 0 };
  const mode = options && options.mode ? String(options.mode) : "";
  if (mode === "tail") {
    const match = text.match(/^\((\d+)p\)$/i);
    return match ? { valid: true, value: Math.max(0, Math.trunc(Number(match[1]) || 0)) } : { valid: false, value: 0 };
  }
  if (mode === "units") {
    const match = text.match(/^(\d+)p$/i);
    return match ? { valid: true, value: Math.max(0, Math.trunc(Number(match[1]) || 0)) } : { valid: false, value: 0 };
  }
  return { valid: /^\d+$/.test(text), value: Math.max(0, Math.trunc(Number(text) || 0)) };
}

function hasQuickEditTailValue(form) {
  return !!(form && String(form.tailInput || "").trim());
}

function hasQuickEditPartialValue(form) {
  if (!form) return false;
  return !!(sanitizeFractionText(form.fractionText) || sanitizeIntegerInput(form.packNotationCount));
}

function splitPackNotation(value) {
  const parsed = parsePackNotation(getMainPackNotationFromState({ packNotation: value }));
  return { sign: parsed.sign || "", count: parsed.count ? String(parsed.count) : "" };
}

function buildRawLocalStockDisplay(stateModel) {
  return buildRawStockDisplay(stateModel);
}

function buildLocalStockDisplay(stateModel) {
  return buildStockDisplay(stateModel);
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

function getArrivalNote(item) {
  return String(
    (item && (item.arrivalNote || item.arrival || item.asn || item.arrivalNumber || item.deliveryNote)) || ""
  ).trim() || "-";
}

function renderDetailStockStateMarkup(item) {
  if (!item) return "";
  const tailDisplay = toInt(item.tail) > 0 ? "(" + toInt(item.tail) + "p)" : "-";
  const unitsDisplay = toInt(item.unitsPerBox) > 0 ? toInt(item.unitsPerBox) + "p" : "-";
  const boxesDisplay = toInt(item.itemBoxes) > 0 ? String(toInt(item.itemBoxes)) : "-";
  const totalPieces = formatMetricNumber(stateModelToPieces(item));
  const totalBoxes = toInt(item.itemBoxes);
  const packText = item.packCounterText || getInventoryPackLine(item) || "-";
  return ''
    + '<table class="w-full border-collapse text-left">'
    + '<thead><tr class="border-b border-outline-variant/20 bg-surface-container-low">'
    + '<th class="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">尾箱</th>'
    + '<th class="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">件/箱</th>'
    + '<th class="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">箱数</th>'
    + '</tr></thead>'
    + '<tbody><tr>'
    + '<td class="px-3 py-3 text-lg font-black tracking-tight text-on-surface">' + escapeHtml(tailDisplay) + '</td>'
    + '<td class="px-3 py-3 text-center text-lg font-black tracking-tight text-on-surface">' + escapeHtml(unitsDisplay) + '</td>'
    + '<td class="px-3 py-3 text-right text-lg font-black tracking-tight text-on-surface">' + escapeHtml(boxesDisplay) + '</td>'
    + '</tr></tbody>'
    + '</table>'
    + '<div class="border-t border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-center">'
    + '<div class="text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Total</div>'
    + '<div class="mt-0.5 text-[13px] font-black tracking-tight text-on-surface">' + escapeHtml(totalBoxes + "箱 · " + packText + " · " + totalPieces + "件") + '</div>'
    + '</div>';
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

function sortItems(items, sortMode) {
  return items.slice().sort(function(a, b) {
    if (sortMode === "warehouse") {
      const warehouseCompare = String(a.warehouse || "").localeCompare(String(b.warehouse || ""));
      if (warehouseCompare !== 0) return warehouseCompare;
    }
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
    if (state.inventoryStockFilter === "positive" && item.stockState !== "positive") return false;
    if (state.inventoryStockFilter === "zero" && item.stockState !== "zero") return false;
    if (!normalizedQuery) return true;
    const haystack = normalizeText([item.reference, item.warehouse, item.stockDisplay, item.remark].join(" "));
    return haystack.indexOf(normalizedQuery) !== -1;
  });
  return sortItems(filtered, state.inventorySort);
}

function isHistoryEntryInPeriod(entry, period) {
  if (!period || period === "all") return true;
  const date = new Date(entry.timestampRaw);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  if (period === "week") {
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return date >= sevenDaysAgo;
  }
  if (period === "month") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  return true;
}

function filterHistoryItems(query, actionType, period) {
  const normalizedQuery = normalizeText(query);
  return state.historyItems
    .filter(function(entry) {
      if (actionType && entry.actionType !== actionType) return false;
      if (!isHistoryEntryInPeriod(entry, period || state.historyPeriod)) return false;
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
  const totals = (items || []).reduce(function(acc, item) {
    const tail = getTailActualPieces(item);
    const unitsPerBox = parsePositiveNumber(item && item.unitsPerBox);
    const itemBoxes = parsePositiveNumber(item && item.itemBoxes);
    const sign = String(item && item.sign ? item.sign : "").trim();
    const fractionValue = parsePositiveNumber(item && item.fractionValue) || parseFractionValue(item && item.fractionText);
    const colisage = parsePositiveNumber(item && item.colisage);
    let itemPieces = tail;
    let cartonCount = tail > 0 ? 1 : 0;

    if (unitsPerBox > 0) {
      if (sign === "+") {
        itemPieces += (unitsPerBox * itemBoxes) + (unitsPerBox * fractionValue);
        cartonCount += itemBoxes + (fractionValue > 0 ? 1 : 0);
      } else if (sign === "×") {
        if (itemBoxes > 1) {
          itemPieces += unitsPerBox * itemBoxes * fractionValue;
          cartonCount += itemBoxes;
        } else if (itemBoxes > 0) {
          itemPieces += unitsPerBox * fractionValue;
          cartonCount += itemBoxes;
        } else if (fractionValue > 0) {
          itemPieces += unitsPerBox * fractionValue;
          cartonCount += 1;
        }
      } else {
        itemPieces += unitsPerBox * itemBoxes;
        cartonCount += itemBoxes;
        if (fractionValue > 0) cartonCount += 1;
      }
    } else if (fractionValue > 0 && itemBoxes <= 0) {
      cartonCount += 1;
    }

    const packMeta = parsePackNotation(getMainPackNotationFromState(item));
    if (packMeta.count > 0 && colisage > 0) {
      itemPieces += (packMeta.sign === "-" ? -1 : 1) * (packMeta.count * colisage);
    }

    acc.totalPieces += itemPieces;
    acc.totalBoxes += cartonCount;
    if (colisage > 0) {
      acc.totalPacks += Math.floor(itemPieces / colisage);
      acc.hasPackData = true;
    }
    return acc;
  }, {
    totalBoxes: 0,
    totalPieces: 0,
    totalPacks: 0,
    hasPackData: false
  });

  return {
    visibleCount: items.length,
    positiveCount: positiveCount,
    zeroCount: Math.max(0, items.length - positiveCount),
    totalPieces: totals.totalPieces,
    totalBoxes: totals.totalBoxes,
    totalPacks: totals.totalPacks,
    hasPackData: totals.hasPackData
  };
}

function formatMetricNumber(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0";
  return String(Math.max(0, Math.floor(numeric)));
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
  const warehouse = item.warehouse || "-";
  const packLine = getInventoryPackLine(item);

  return ''
    + '<article class="inventory-card bg-surface-container-lowest relative border-l-4 ' + accentClass + ' flex min-h-[4.1rem] items-stretch transition-colors duration-150 hover:bg-surface-container select-none" data-item-id="' + escapeHtml(itemId) + '" data-reference="' + escapeHtml(reference) + '" data-stock-display="' + escapeHtml(stockDisplay) + '" data-stock-state="' + escapeHtml(item.stockState) + '">'
    + '<button class="inventory-card-main flex min-w-0 flex-1 flex-col justify-between px-2.5 py-2 text-left" type="button" data-action="open-quick-edit" data-item-id="' + escapeHtml(itemId) + '">'
    + '<div class="flex items-start justify-between gap-2">'
    + '<span class="truncate pr-2 text-[12px] font-bold tracking-tight text-on-surface">' + escapeHtml(reference) + '</span>'
    + '<span class="max-w-[45%] truncate text-right text-[9px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">' + escapeHtml(warehouse) + '</span>'
    + '</div>'
    + '<div class="mt-1.5 flex items-end justify-between gap-2">'
    + '<div class="min-w-0">'
    + '<span class="block truncate text-[13px] font-medium ' + stockClass + '">' + escapeHtml(stockDisplay) + '</span>'
    + (packLine ? '<span class="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[0.16em] text-primary/80">' + escapeHtml(packLine) + '</span>' : '')
    + '</div>'
    + '</div>'
    + '</button>'
    + '<a class="reference-detail-trigger flex w-10 shrink-0 touch-manipulation select-none items-center justify-center border-l border-outline-variant/20 text-outline-variant transition-colors duration-150 hover:bg-surface-container-highest hover:text-on-surface-variant active:bg-surface-container-high" href="#detail/' + encodeURIComponent(reference) + '" aria-label="Ouvrir la fiche de ' + escapeHtml(reference) + '">'
    + '<span class="material-symbols-outlined !text-[16px]">chevron_right</span>'
    + '</a>'
    + '</article>';
}

function getInventoryPackLine(item) {
  const parts = [];
  const mainPack = getMainPackNotationFromState(item);
  if (mainPack) parts.push(mainPack);
  if (item.packCounterText) parts.push(item.packCounterText + "包");
  if (toInt(item.colisage) > 0) parts.push(String(toInt(item.colisage)) + "件/包");
  return parts.join(" · ");
}

function renderColumnLayoutMarkup(columns) {
  if (!columns.length) return "";
  return '<div class="flex items-start gap-px bg-outline-variant/20">' + columns.map(function(columnItems) {
    return '<div class="inventory-column flex min-w-0 flex-1 flex-col gap-px bg-outline-variant/20">' + columnItems.map(renderInventoryCard).join("") + '</div>';
  }).join("") + '</div>';
}

function renderHistoryCard(entry) {
  const timeLabel = formatHistoryTimeLabel(entry.timestampRaw, entry.timestampLabel);
  return ''
    + '<article class="bg-surface-container-lowest px-3 py-2 shadow-ledger" data-history-reference="' + escapeHtml(entry.reference) + '">'
    + '<div class="grid grid-cols-[3.1rem_minmax(3.8rem,0.9fr)_auto_minmax(0,1.5fr)] items-start gap-2">'
    + '<time class="pt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">' + escapeHtml(timeLabel) + '</time>'
    + '<a class="truncate text-[12px] font-bold tracking-tight text-primary" href="#detail/' + encodeURIComponent(entry.reference) + '">' + escapeHtml(entry.reference || "-") + '</a>'
    + '<span class="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ' + getActionBadgeClass(entry.actionType) + '">' + escapeHtml(getActionLabel(entry.actionType)) + '</span>'
    + '<div class="min-w-0 space-y-0.5 text-[10px] leading-4 text-on-surface">'
    + '<div class="truncate"><span class="font-bold uppercase tracking-[0.12em] text-on-surface-variant">AV</span><span class="ml-1">' + escapeHtml(entry.beforeDisplay || "-") + '</span></div>'
    + '<div class="truncate"><span class="font-bold uppercase tracking-[0.12em] text-on-surface-variant">AP</span><span class="ml-1">' + escapeHtml(entry.afterDisplay || "-") + '</span></div>'
    + (entry.remark ? '<div class="truncate text-on-surface-variant">' + escapeHtml(entry.remark) + '</div>' : '')
    + '</div>'
    + '</article>';
}

function renderHistoryListMarkup(items) {
  let lastGroup = "";
  return items.map(function(entry) {
    const group = getHistoryDateGroupLabel(entry.timestampRaw);
    const separator = group !== lastGroup
      ? '<div class="sticky top-0 z-10 border-y border-outline-variant/20 bg-surface-container-high px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">' + escapeHtml(group) + '</div>'
      : "";
    lastGroup = group;
    return separator + renderHistoryCard(entry);
  }).join("");
}

function getHistoryDateGroupLabel(timestampRaw) {
  const date = new Date(timestampRaw);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startToday - startDate) / 86400000);
  if (diffDays === 0) return "Aujourd’hui";
  if (diffDays === 1) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

function formatHistoryTimeLabel(timestampRaw, fallback) {
  const date = new Date(timestampRaw);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date).replace(":", "h");
  }
  return fallback || "--:--";
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
  const els = {
    quickEditOverlay: document.getElementById("quickEditOverlay"),
    quickEditModal: document.getElementById("quickEditModal"),
    quickEditBody: document.getElementById("quickEditBody"),
    quickEditFooter: document.getElementById("quickEditFooter"),
    quickEditReference: document.getElementById("quickEditReference"),
    quickEditStockDisplay: document.getElementById("quickEditStockDisplay"),
    quickEditTabQuickExit: document.getElementById("quickEditTabQuickExit"),
    quickEditTabEdit: document.getElementById("quickEditTabEdit"),
    quickExitPanelWrap: document.getElementById("quickExitPanelWrap"),
    quickExitPanel: document.getElementById("quickExitPanel"),
    quickExitPacksHint: document.getElementById("quickExitPacksHint"),
    quickExitPacksHintText: document.getElementById("quickExitPacksHintText"),
    quickExitCurrentStockScroll: document.getElementById("quickExitCurrentStockScroll"),
    quickExitCurrentStock: document.getElementById("quickExitCurrentStock"),
    quickExitClearButton: document.getElementById("quickExitClearButton"),
    quickExitSegmentFormsScroll: document.getElementById("quickExitSegmentFormsScroll"),
    quickExitSegmentForms: document.getElementById("quickExitSegmentForms"),
    quickExitPreviewWrap: document.getElementById("quickExitPreviewWrap"),
    quickExitPreview: document.getElementById("quickExitPreview"),
    quickExitDropdownLayer: document.getElementById("quickExitDropdownLayer"),
    quickEditForm: document.getElementById("quickEditForm"),
    quickEditExpressionCenterWrap: document.getElementById("quickEditExpressionCenterWrap"),
    quickEditExpressionScroll: document.getElementById("quickEditExpressionScroll"),
    quickEditExpressionMeasure: document.getElementById("quickEditExpressionMeasure"),
    quickEditExpressionLine: document.getElementById("quickEditExpressionLine"),
    quickEditTailSlot: document.getElementById("quickEditTailSlot"),
    quickEditTailToggle: document.getElementById("quickEditTailToggle"),
    quickEditTailToggleIcon: document.getElementById("quickEditTailToggleIcon"),
    quickEditTailGroup: document.getElementById("quickEditTailGroup"),
    quickEditTailSegment: document.getElementById("quickEditTailSegment"),
    quickEditTail: document.getElementById("quickEditTail"),
    quickEditTailJoinSlot: document.getElementById("quickEditTailJoinSlot"),
    quickEditTailJoin: document.getElementById("quickEditTailJoin"),
    quickEditUnitsPerBoxSlot: document.getElementById("quickEditUnitsPerBoxSlot"),
    quickEditUnitsPerBoxField: document.getElementById("quickEditUnitsPerBoxField"),
    quickEditUnitsPerBox: document.getElementById("quickEditUnitsPerBox"),
    quickEditMultiplyJoinSlot: document.getElementById("quickEditMultiplyJoinSlot"),
    quickEditMultiplyJoin: document.getElementById("quickEditMultiplyJoin"),
    quickEditItemBoxesSlot: document.getElementById("quickEditItemBoxesSlot"),
    quickEditItemBoxesField: document.getElementById("quickEditItemBoxesField"),
    quickEditItemBoxes: document.getElementById("quickEditItemBoxes"),
    quickEditPartialSlot: document.getElementById("quickEditPartialSlot"),
    quickEditPartialToggle: document.getElementById("quickEditPartialToggle"),
    quickEditPartialToggleIcon: document.getElementById("quickEditPartialToggleIcon"),
    quickEditPartialGroup: document.getElementById("quickEditPartialGroup"),
    quickEditPartialSegment: document.getElementById("quickEditPartialSegment"),
    quickEditSignField: document.getElementById("quickEditSignField"),
    quickEditFractionTextField: document.getElementById("quickEditFractionTextField"),
    quickEditPackSignField: document.getElementById("quickEditPackSignField"),
    quickEditPackCountField: document.getElementById("quickEditPackCountField"),
    quickEditSign: document.getElementById("quickEditSign"),
    quickEditFractionText: document.getElementById("quickEditFractionText"),
    quickEditPackNotationSign: document.getElementById("quickEditPackNotationSign"),
    quickEditPackNotationCount: document.getElementById("quickEditPackNotationCount"),
    quickEditRemoveCenterWrap: document.getElementById("quickEditRemoveCenterWrap"),
    quickEditRemoveScroll: document.getElementById("quickEditRemoveScroll"),
    quickEditRemoveMeasure: document.getElementById("quickEditRemoveMeasure"),
    quickEditTailRemoveSlot: document.getElementById("quickEditTailRemoveSlot"),
    quickEditTailRemove: document.getElementById("quickEditTailRemove"),
    quickEditTailRemoveJoinSlot: document.getElementById("quickEditTailRemoveJoinSlot"),
    quickEditUnitsPerBoxRemoveSpacer: document.getElementById("quickEditUnitsPerBoxRemoveSpacer"),
    quickEditMultiplyRemoveSpacerSlot: document.getElementById("quickEditMultiplyRemoveSpacerSlot"),
    quickEditMultiplyRemoveSpacer: document.getElementById("quickEditMultiplyRemoveSpacer"),
    quickEditItemBoxesRemoveSpacer: document.getElementById("quickEditItemBoxesRemoveSpacer"),
    quickEditPartialRemoveSlot: document.getElementById("quickEditPartialRemoveSlot"),
    quickEditPartialRemove: document.getElementById("quickEditPartialRemove"),
    quickEditRemark: document.getElementById("quickEditRemark"),
    quickEditMessage: document.getElementById("quickEditMessage"),
    quickEditCancel: document.getElementById("quickEditCancel"),
    quickEditSave: document.getElementById("quickEditSave")
  };
  els.overlay = els.quickEditOverlay;
  els.modal = els.quickEditModal;
  els.reference = els.quickEditReference;
  els.stockDisplay = els.quickEditStockDisplay;
  els.tabQuickExit = els.quickEditTabQuickExit;
  els.tabEdit = els.quickEditTabEdit;
  els.form = els.quickEditForm;
  els.tailToggle = els.quickEditTailToggle;
  els.tailToggleIcon = els.quickEditTailToggleIcon;
  els.tailGroup = els.quickEditTailGroup;
  els.tailJoinSlot = els.quickEditTailJoinSlot;
  els.tailRemove = els.quickEditTailRemove;
  els.partialToggle = els.quickEditPartialToggle;
  els.partialToggleIcon = els.quickEditPartialToggleIcon;
  els.partialGroup = els.quickEditPartialGroup;
  els.partialRemove = els.quickEditPartialRemove;
  els.tail = els.quickEditTail;
  els.unitsPerBox = els.quickEditUnitsPerBox;
  els.itemBoxes = els.quickEditItemBoxes;
  els.sign = els.quickEditSign;
  els.fractionText = els.quickEditFractionText;
  els.packNotationSign = els.quickEditPackNotationSign;
  els.packNotationCount = els.quickEditPackNotationCount;
  els.signField = els.quickEditSignField;
  els.fractionTextField = els.quickEditFractionTextField;
  els.packSignField = els.quickEditPackSignField;
  els.packCountField = els.quickEditPackCountField;
  els.remark = els.quickEditRemark;
  els.message = els.quickEditMessage;
  els.cancel = els.quickEditCancel;
  els.save = els.quickEditSave;
  return els;
}

function setQuickEditError(message) {
  state.quickEditError = String(message || "").trim();
}

let quickEditLayoutObserver_ = null;

function resetQuickExitErrors_() {
  state.quickExitSegmentErrors = {};
}

function syncQuickEditTabs(els) {
  const isQuickExit = state.quickEditTab === "quick-exit";
  els.quickExitPanel.classList.toggle("hidden", !isQuickExit);
  els.form.classList.toggle("hidden", isQuickExit);
  els.tabQuickExit.className = "border border-outline-variant/30 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] " + (isQuickExit ? "bg-surface-tint text-on-primary" : "text-on-surface-variant");
  els.tabEdit.className = "border border-outline-variant/30 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] " + (!isQuickExit ? "bg-surface-tint text-on-primary" : "text-on-surface-variant");
  els.save.textContent = isQuickExit ? "APPLIQUER LA SORTIE" : "ENREGISTRER";
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getControlTextWidth_(value, fallbackValue, minChars, maxChars, extraChars) {
  const source = String(value || fallbackValue || "").trim();
  const effectiveLength = source ? source.length : 0;
  return clampNumber(effectiveLength + (extraChars || 0), minChars, maxChars);
}

function setFieldWidth_(fieldEl, inputEl, value, fallbackValue, minChars, maxChars, extraChars) {
  if (!fieldEl || !inputEl) return;
  const widthInCh = getControlTextWidth_(value, fallbackValue, minChars, maxChars, extraChars);
  fieldEl.style.width = widthInCh + "ch";
  inputEl.style.width = widthInCh + "ch";
}

function isVisibleQuickEditAnchor_(element) {
  if (!element || element.classList.contains("hidden")) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getQuickEditAnchor_(inputEl, fallbackEl) {
  if (isVisibleQuickEditAnchor_(inputEl)) return inputEl;
  if (isVisibleQuickEditAnchor_(fallbackEl)) return fallbackEl;
  return null;
}

function clearQuickEditOperatorPosition_(operatorEl) {
  if (!operatorEl) return;
  operatorEl.style.left = "";
  operatorEl.style.top = "";
  operatorEl.style.transform = "";
}

function positionQuickEditOperatorBetween_(operatorEl, leftAnchorEl, rightAnchorEl) {
  const els = getQuickEditElements();
  if (!operatorEl || !leftAnchorEl || !rightAnchorEl || !els.form) {
    clearQuickEditOperatorPosition_(operatorEl);
    return;
  }
  const line = document.getElementById("quickEditExpressionLine");
  if (!line) {
    clearQuickEditOperatorPosition_(operatorEl);
    return;
  }
  const lineRect = line.getBoundingClientRect();
  const leftRect = leftAnchorEl.getBoundingClientRect();
  const rightRect = rightAnchorEl.getBoundingClientRect();
  if (!(lineRect.width > 0 && leftRect.width > 0 && rightRect.width > 0)) {
    clearQuickEditOperatorPosition_(operatorEl);
    return;
  }
  const centerX = ((leftRect.left + (leftRect.width / 2)) + (rightRect.left + (rightRect.width / 2))) / 2;
  const centerY = ((leftRect.top + (leftRect.height / 2)) + (rightRect.top + (rightRect.height / 2))) / 2;
  operatorEl.style.left = (centerX - lineRect.left) + "px";
  operatorEl.style.top = (centerY - lineRect.top) + "px";
  operatorEl.style.transform = "translate(-50%, -50%)";
}

function getDefaultQuickExitConfig_(segment) {
  return {
    entry: "",
    dropdownOpen: false,
    highlightedIndex: -1
  };
}

function ensureQuickExitForm_() {
  if (!state.quickExitForm || typeof state.quickExitForm !== "object") {
    state.quickExitForm = { segments: {} };
  }
  if (!state.quickExitForm.segments || typeof state.quickExitForm.segments !== "object") {
    state.quickExitForm.segments = {};
  }
  return state.quickExitForm;
}

function getQuickExitSegments_(item) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem) return [];
  const unitsPerBox = Math.max(0, Math.trunc(Number(currentItem.unitsPerBox) || 0));
  const tailPieces = getTailActualPieces(currentItem);
  const totalPieces = stateModelToPieces(currentItem);
  const mainPieces = Math.max(0, totalPieces - tailPieces);
  const colisage = Math.max(0, Math.trunc(Number(currentItem.colisage) || 0));
  const segments = [];
  if (tailPieces > 0) {
    const tailActions = [{ value: "pieces", label: "件" }];
    if (colisage > 0) tailActions.push({ value: "packs", label: "x包" });
    if (unitsPerBox > 0) tailActions.push({ value: "fraction", label: "fraction" });
    segments.push({
      id: "tail",
      label: buildTailDisplay(currentItem),
      availablePieces: tailPieces,
      actions: tailActions
    });
  }
  if (mainPieces > 0) {
    const mainActions = [];
    if (unitsPerBox > 0) mainActions.push({ value: "boxes", label: "x箱" });
    if (colisage > 0) mainActions.push({ value: "packs", label: "x包" });
    if (unitsPerBox > 0) mainActions.push({ value: "fraction", label: "fraction" });
    segments.push({
      id: "main",
      label: buildRawLocalStockDisplay(Object.assign({}, currentItem, { tail: 0, packNotation: getMainPackNotationFromState(currentItem) })),
      availablePieces: mainPieces,
      actions: mainActions
    });
  }
  return segments;
}

function getQuickExitSegmentMap_(item) {
  return getQuickExitSegments_(item).reduce(function(map, segment) {
    map[segment.id] = segment;
    return map;
  }, {});
}

function getQuickExitSelectionConfig_(segmentId) {
  const form = state.quickExitForm || { segments: {} };
  return form.segments && form.segments[segmentId] ? form.segments[segmentId] : null;
}

function buildQuickExitEmptyMainState_(item, remark) {
  return {
    tail: 0,
    unitsPerBox: Math.max(0, Math.trunc(Number(item && item.unitsPerBox) || 0)),
    itemBoxes: 0,
    sign: "",
    fractionText: "",
    fractionValue: 0,
    colisage: Math.max(0, Math.trunc(Number(item && item.colisage) || 0)),
    packNotation: "",
    remark: String(remark || "").trim()
  };
}

function buildQuickExitCurrentMainState_(item, remark) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem) return null;
  const mainState = {
    tail: 0,
    unitsPerBox: Math.max(0, Math.trunc(Number(currentItem.unitsPerBox) || 0)),
    itemBoxes: Math.max(0, Math.trunc(Number(currentItem.itemBoxes) || 0)),
    sign: sanitizeSign(currentItem.sign),
    fractionText: sanitizeFractionText(currentItem.fractionText),
    fractionValue: parseFractionValue(currentItem.fractionValue || currentItem.fractionText),
    colisage: Math.max(0, Math.trunc(Number(currentItem.colisage) || 0)),
    packNotation: getMainPackNotationFromState(currentItem),
    remark: String(remark || currentItem.remark || "").trim()
  };
  return stateModelToPieces(mainState) > 0
    ? mainState
    : buildQuickExitEmptyMainState_(currentItem, remark);
}

function buildQuickExitCombinedState_(item, tailState, mainState, remark) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem) return null;
  const resolvedRemark = String(remark || "").trim();
  const resolvedMainState = mainState || buildQuickExitEmptyMainState_(currentItem, resolvedRemark);
  const resolvedTailState = tailState || { tail: 0, tailNotation: "" };
  const mainPackNotation = getMainPackNotationFromState(resolvedMainState);
  return {
    tail: Math.max(0, Math.trunc(Number(resolvedTailState.tail) || 0)),
    unitsPerBox: Math.max(0, Math.trunc(Number(resolvedMainState.unitsPerBox) || 0)),
    itemBoxes: Math.max(0, Math.trunc(Number(resolvedMainState.itemBoxes) || 0)),
    sign: sanitizeSign(resolvedMainState.sign),
    fractionText: sanitizeFractionText(resolvedMainState.fractionText),
    fractionValue: parseFractionValue(resolvedMainState.fractionValue || resolvedMainState.fractionText),
    colisage: Math.max(0, Math.trunc(Number(resolvedMainState.colisage) || 0)),
    packNotation: buildCompositePackNotation(resolvedTailState.tailNotation, mainPackNotation),
    remark: resolvedRemark
  };
}

function buildQuickExitTailState_(baseTailPieces, nextTailPieces, exitMode, item, exitFractionText) {
  const currentItem = item || state.quickEditItem;
  const safeBaseTailPieces = Math.max(0, Math.trunc(Number(baseTailPieces) || 0));
  const safeNextTailPieces = Math.max(0, Number(nextTailPieces || 0));
  const colisage = Math.max(0, Math.trunc(Number(currentItem && currentItem.colisage) || 0));
  if (!(safeNextTailPieces > 0) || !(safeBaseTailPieces > 0)) return { tail: 0, tailNotation: "" };
  if (safeNextTailPieces >= safeBaseTailPieces) return { tail: safeBaseTailPieces, tailNotation: "" };
  if (exitMode === "packs" && colisage > 0) {
    const removedPieces = safeBaseTailPieces - safeNextTailPieces;
    if (removedPieces > 0 && removedPieces % colisage === 0) {
      return { tail: safeBaseTailPieces, tailNotation: "-" + (removedPieces / colisage) + "包" };
    }
  }
  if (exitMode === "fraction" && exitFractionText) {
    const remainingValue = Math.max(0, 1 - parseFractionValue(exitFractionText));
    if (remainingValue > 0 && remainingValue < 1) {
      const remainingText = fractionTextFromPieces(Math.round(safeBaseTailPieces * remainingValue), safeBaseTailPieces);
      if (remainingText) return { tail: safeBaseTailPieces, tailNotation: remainingText };
    }
  }
  {
    const remainingText = fractionTextFromPieces(safeNextTailPieces, safeBaseTailPieces);
    if (remainingText) return { tail: safeBaseTailPieces, tailNotation: remainingText };
  }
  return { tail: safeNextTailPieces, tailNotation: "" };
}

function buildQuickExitComputedState_(item, options) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem || !state.quickExitForm || !state.quickExitForm.segments) return null;
  const strict = !!(options && options.strict);
  const remark = String(state.quickEditForm && state.quickEditForm.remark || "").trim();
  const segments = getQuickExitSegments_(currentItem);
  const selectedSegments = segments.filter(function(segment) {
    return !!getQuickExitSelectionConfig_(segment.id);
  });
  if (!selectedSegments.length) return null;
  const currentTailBasePieces = Math.max(0, Math.trunc(Number(currentItem.tail) || 0));
  const currentTailPieces = getTailActualPieces(currentItem);
  const currentMainState = buildQuickExitCurrentMainState_(currentItem, remark);
  const currentMainPieces = Math.max(0, Math.round(stateModelToPieces(currentMainState)));
  let nextTailState = { tail: currentTailBasePieces, tailNotation: getTailNotationFromState(currentItem) };
  let nextMainState = currentMainState;
  let validSegments = 0;
  const segmentErrors = {};

  for (let i = 0; i < selectedSegments.length; i++) {
    const segment = selectedSegments[i];
    const config = getQuickExitSelectionConfig_(segment.id);
    const result = parseQuickExitSegmentEntry_(currentItem, segment, config);
    if (!result || !result.valid) {
      if (strict) {
        segmentErrors[segment.id] = result && result.message ? result.message : "Sortie invalide.";
        return { valid: false, message: result && result.message ? result.message : "Sortie invalide.", segmentErrors: segmentErrors };
      }
      continue;
    }
    if (segment.id === "tail") {
      const updatedTailPieces = currentTailPieces - result.pieces;
      if (updatedTailPieces < 0) {
        if (strict) {
          segmentErrors[segment.id] = "Sortie trop grande pour 尾箱.";
          return { valid: false, message: "Sortie trop grande pour le stock courant.", segmentErrors: segmentErrors };
        }
        continue;
      }
      nextTailState = buildQuickExitTailState_(currentTailBasePieces, updatedTailPieces, result.mode, currentItem, result.fractionText);
      validSegments += 1;
      continue;
    }
    if (segment.id === "main") {
      const updatedMainPieces = currentMainPieces - result.pieces;
      if (updatedMainPieces < 0) {
        if (strict) {
          segmentErrors[segment.id] = "Sortie trop grande pour le stock principal.";
          return { valid: false, message: "Sortie trop grande pour le stock courant.", segmentErrors: segmentErrors };
        }
        continue;
      }
      const rebuiltMainState = buildStateFromPieces(updatedMainPieces, {
        unitsPerBox: currentItem.unitsPerBox,
        colisage: currentItem.colisage,
        remark: remark,
        reconstructionMode: result.mode
      });
      if (!rebuiltMainState) {
        if (strict) {
          segmentErrors[segment.id] = "Impossible de calculer l'etat apres sortie.";
          return { valid: false, message: "Impossible de calculer l'etat apres sortie.", segmentErrors: segmentErrors };
        }
        continue;
      }
      nextMainState = rebuiltMainState;
      validSegments += 1;
    }
  }

  if (!validSegments) return null;
  return { valid: true, nextState: buildQuickExitCombinedState_(currentItem, nextTailState, nextMainState, remark) };
}

function setQuickExitClearSelected_(nextValue) {
  const shouldEnable = !!nextValue;
  state.quickExitClearSelected = shouldEnable;
  ensureQuickExitForm_();
  if (shouldEnable) {
    state.quickExitForm.segments = {};
  }
  clearQuickExitDropdownLayer_();
  resetQuickExitErrors_();
}

function toggleQuickExitSegment_(segmentId) {
  const segments = getQuickExitSegmentMap_();
  if (!segments[segmentId]) return;
  ensureQuickExitForm_();
  if (state.quickExitClearSelected) state.quickExitClearSelected = false;
  if (state.quickExitForm.segments[segmentId]) {
    delete state.quickExitForm.segments[segmentId];
  } else {
    state.quickExitForm.segments[segmentId] = getDefaultQuickExitConfig_(segments[segmentId]);
  }
  resetQuickExitErrors_();
  renderQuickEdit();
}

function syncQuickEditBuilderUi(els) {
  const tailOpen = !!state.quickEditTailOpen;
  const partialOpen = !!state.quickEditPartialOpen;
  els.tailGroup.classList.toggle("hidden", !tailOpen);
  els.tailGroup.classList.toggle("flex", tailOpen);
  els.tailToggle.classList.toggle("hidden", tailOpen);
  els.tailJoinSlot.classList.toggle("hidden", !tailOpen);
  els.tailRemove.classList.toggle("hidden", !tailOpen);
  els.partialGroup.classList.toggle("hidden", !partialOpen);
  els.partialGroup.classList.toggle("flex", partialOpen);
  els.partialToggle.classList.toggle("hidden", partialOpen);
  els.partialRemove.classList.toggle("hidden", !partialOpen);
  els.tailToggleIcon.textContent = tailOpen ? "−" : "+";
  els.partialToggleIcon.textContent = partialOpen ? "−" : "+";
}

function buildCurrentEditStateModel() {
  if (!state.quickEditItem || !state.quickEditForm) return null;
  const form = state.quickEditForm || {};
  const tailResult = parseStyledIntegerInput(state.quickEditForm.tailInput, { mode: "tail" });
  const unitsResult = parseStyledIntegerInput(state.quickEditForm.unitsPerBoxInput, { mode: "units" });
  if (!tailResult.valid || !unitsResult.valid) return null;
  const fractionText = sanitizeFractionText(state.quickEditForm.fractionText);
  return {
    tail: tailResult.value,
    unitsPerBox: unitsResult.value,
    itemBoxes: Math.max(0, toInt(form.itemBoxes)),
    sign: sanitizeSign(state.quickEditForm.sign),
    fractionText: fractionText,
    fractionValue: parseFractionValue(fractionText),
    colisage: Math.max(0, toInt(state.quickEditItem.colisage)),
    packNotation: buildPackNotationFromParts(state.quickEditForm.packNotationSign, state.quickEditForm.packNotationCount, ""),
    remark: String(form.remark || "").trim()
  };
}

function computeQuickExitPreviewState_(item) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem || !state.quickExitForm || !state.quickExitForm.segments) return null;
  if (state.quickExitClearSelected) {
    return { valid: true, nextState: buildQuickExitEmptyMainState_(currentItem, String(state.quickEditForm && state.quickEditForm.remark || "").trim()) };
  }
  return buildQuickExitComputedState_(currentItem, { strict: false });
}

function computeQuickExitPreview(item) {
  if (state.quickExitClearSelected) return "空";
  const result = computeQuickExitPreviewState_(item);
  if (!(result && result.valid && result.nextState)) return "";
  return stateModelToPieces(result.nextState) === 0 ? "空" : buildLocalStockDisplay(result.nextState);
}

function validateQuickExitPayload(item) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem) return null;
  if (state.quickExitClearSelected) {
    resetQuickExitErrors_();
    return normalizeStateModel({
      tail: 0,
      unitsPerBox: Math.max(0, toInt(currentItem.unitsPerBox)),
      itemBoxes: 0,
      sign: "",
      fractionText: "",
      fractionValue: 0,
      colisage: Math.max(0, toInt(currentItem.colisage)),
      packNotation: "",
      remark: String(state.quickEditForm && state.quickEditForm.remark || "").trim()
    });
  }
  if (!state.quickExitForm) return null;
  const result = buildQuickExitResultState_(currentItem);
  if (!result || !result.valid || !result.nextState) {
    state.quickExitSegmentErrors = result && result.segmentErrors ? result.segmentErrors : {};
    setQuickEditError(result && result.message ? result.message : "Selectionne au moins un segment de sortie.");
    return null;
  }
  state.quickExitSegmentErrors = {};
  return normalizeStateModel(result.nextState);
}

function renderQuickExitSegmentsMarkup_(item) {
  const segments = getQuickExitSegments_(item);
  if (!segments.length) return '<span class="text-on-surface-variant">-</span>';
  return segments.map(function(segment, index) {
    const selected = !state.quickExitClearSelected && !!getQuickExitSelectionConfig_(segment.id);
    const joinMarkup = index > 0 ? '<span aria-hidden="true" class="pointer-events-none inline-flex items-center text-sm font-medium text-on-surface-variant/80">+</span>' : '';
    return joinMarkup + '<button class="inline-flex cursor-pointer items-center rounded border px-2 py-1 text-sm font-semibold transition-colors duration-150 focus:outline-none '
      + (selected ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 text-primary hover:bg-surface-container')
      + '" data-quick-exit-segment="' + escapeHtml(segment.id) + '" type="button">'
      + escapeHtml(segment.label || segment.id)
      + '</button>';
  }).join("");
}

function renderQuickExitSegmentForms_(item) {
  const els = getQuickEditElements();
  if (state.quickExitClearSelected) {
    els.quickExitSegmentForms.innerHTML = "";
    clearQuickExitDropdownLayer_();
    return;
  }
  const segments = getQuickExitSegments_(item).filter(function(segment) {
    return !!getQuickExitSelectionConfig_(segment.id);
  });
  if (!segments.length) {
    els.quickExitSegmentForms.innerHTML = "";
    clearQuickExitDropdownLayer_();
    return;
  }
  els.quickExitSegmentForms.innerHTML = segments.map(function(segment, index) {
    const config = getQuickExitSelectionConfig_(segment.id) || getDefaultQuickExitConfig_(segment);
    return '<div class="min-w-fit' + (index > 0 ? ' border-l border-outline-variant/20 pl-6' : '') + '">'
      + '<div class="flex min-w-fit flex-col items-start justify-end">'
      + '<div class="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">' + escapeHtml(segment.id === "tail" ? "尾箱" : "箱") + '</div>'
      + '<div class="mt-1 text-sm font-semibold text-on-surface">' + escapeHtml(segment.label) + '</div>'
      + '<div class="mt-2 min-h-[4.5rem]">'
      + '<div class="relative min-w-0" data-quick-exit-wrapper="' + escapeHtml(segment.id) + '">'
      + '<label class="block min-w-0"><span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">valeur</span><input class="w-[8.25rem] border-outline-variant/30 bg-surface-container-low px-2 py-1 text-[16px] leading-tight font-semibold text-on-surface opacity-100 caret-on-surface placeholder:text-outline focus:text-on-surface md:text-sm" data-quick-exit-field="entry" data-segment-id="' + escapeHtml(segment.id) + '" inputmode="decimal" type="text" placeholder="' + escapeHtml(getQuickExitSegmentPlaceholder_(segment)) + '" value="' + escapeHtml(config.entry || "") + '" autocomplete="off" /></label>'
      + '<div class="hidden" data-quick-exit-dropdown="' + escapeHtml(segment.id) + '" data-quick-exit-role="suggestions"></div>'
      + '</div>'
      + '<p class="mt-2 hidden max-w-[15rem] text-[11px] font-medium text-error" data-quick-exit-error="' + escapeHtml(segment.id) + '"></p>'
      + '</div>'
      + '</div>'
      + '</div>';
  }).join("");
  segments.forEach(function(segment) {
    renderQuickExitSegmentUi_(segment.id);
  });
}

function getQuickExitSegmentPlaceholder_(segment) {
  return segment && segment.id === "tail" ? "(x)/3包/ 1/2 / 2/3" : "2箱/5包/ 1/2 / 2/3";
}

function getAllowedQuickExitFractions_() {
  return ["1/2", "1/3", "1/4", "2/3", "2/4", "3/4"];
}

function getQuickExitWholeBoxesLimit_(item, segment) {
  if (!item || !segment || segment.id !== "main") return 0;
  const unitsPerBox = Math.max(0, Math.trunc(Number(item.unitsPerBox) || 0));
  if (!(unitsPerBox > 0)) return 0;
  return Math.max(0, Math.floor(segment.availablePieces / unitsPerBox));
}

function getQuickExitPackLimit_(item, segment) {
  if (!item || !segment) return 0;
  const colisage = Math.max(0, Math.trunc(Number(item.colisage) || 0));
  if (!(colisage > 0)) return 0;
  return Math.max(0, Math.floor(segment.availablePieces / colisage));
}

function getQuickExitFractionCandidates_(item, segment) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem || !segment) return [];
  if (segment.id === "tail") return getAllowedQuickExitFractions_().slice();
  const currentFractionText = sanitizeFractionText(currentItem.fractionText);
  if (!currentFractionText) return getAllowedQuickExitFractions_().slice();
  const match = currentFractionText.match(/^(\d+)\/(\d+)$/);
  if (!match) return [];
  const numerator = Math.max(0, Math.trunc(Number(match[1]) || 0));
  const denominator = Math.max(0, Math.trunc(Number(match[2]) || 0));
  return getAllowedQuickExitFractions_().filter(function(fractionText) {
    const parts = fractionText.match(/^(\d+)\/(\d+)$/);
    if (!parts) return false;
    const num = Math.max(0, Math.trunc(Number(parts[1]) || 0));
    const den = Math.max(0, Math.trunc(Number(parts[2]) || 0));
    return den === denominator && num > 0 && num <= numerator;
  });
}

function normalizeQuickExitEntry_(entry) {
  const normalized = String(entry || "").trim().replace(/\s+/g, "");
  if (!normalized) return "";
  const tailMatch = normalized.match(/^\((\d+)p\)$/i);
  if (tailMatch) return "(" + Math.max(0, Math.trunc(Number(tailMatch[1]) || 0)) + "p)";
  const boxMatch = normalized.match(/^0*(\d+)箱$/);
  if (boxMatch) return (Math.max(0, Math.trunc(Number(boxMatch[1]) || 0))) + "箱";
  const packMatch = normalized.match(/^0*(\d+)包$/);
  if (packMatch) return (Math.max(0, Math.trunc(Number(packMatch[1]) || 0))) + "包";
  const fractionMatch = normalized.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) return Math.max(0, Math.trunc(Number(fractionMatch[1]) || 0)) + "/" + Math.max(0, Math.trunc(Number(fractionMatch[2]) || 0));
  return normalized;
}

function getQuickExitFractionPieces_(item, segment, fractionText) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem || !segment) return 0;
  if (getQuickExitFractionCandidates_(currentItem, segment).indexOf(fractionText) === -1) return 0;
  const fractionValue = parseFractionValue(fractionText);
  if (segment.id === "tail") {
    const currentTailPieces = Math.max(0, Number(getTailActualPieces(currentItem)) || 0);
    if (!(fractionValue > 0) || !(fractionValue < 1) || !(currentTailPieces > 0)) return 0;
    const pieces = currentTailPieces * fractionValue;
    return pieces > 0 ? pieces : 0;
  }
  const unitsPerBox = Math.max(0, Math.trunc(Number(currentItem.unitsPerBox) || 0));
  if (!(unitsPerBox > 0)) return 0;
  const pieces = unitsPerBox * fractionValue;
  if (!(pieces > 0) || Math.round(pieces) !== pieces) return 0;
  if (pieces > segment.availablePieces) return 0;
  const totalPieces = stateModelToPieces(currentItem);
  const currentTailPieces = Math.max(0, Number(getTailActualPieces(currentItem)) || 0);
  const currentMainPieces = Math.max(0, totalPieces - currentTailPieces);
  const newMainPieces = currentMainPieces - pieces;
  if (newMainPieces < 0 || Math.round(newMainPieces) !== newMainPieces) return 0;
  const nextState = buildStateFromPieces(newMainPieces, {
    unitsPerBox: currentItem.unitsPerBox,
    colisage: currentItem.colisage,
    remark: state.quickEditForm && state.quickEditForm.remark,
    reconstructionMode: "fraction"
  });
  return nextState ? pieces : 0;
}

function isQuickExitFractionAllowed_(item, segment, fractionText) {
  return getQuickExitFractionPieces_(item, segment, fractionText) > 0;
}

function getQuickExitDefaultSuggestions_(item, segment) {
  const currentItem = item || state.quickEditItem;
  const suggestions = [];
  if (!currentItem || !segment) return suggestions;
  if (segment.id === "main") {
    const boxLimit = getQuickExitWholeBoxesLimit_(currentItem, segment);
    const defaultBoxMax = Math.min(boxLimit, 3);
    for (let count = 1; count <= defaultBoxMax; count++) suggestions.push(count + "箱");
  }
  if (segment.id === "tail" && segment.label) suggestions.push(segment.label);
  const packLimit = getQuickExitPackLimit_(currentItem, segment);
  const defaultPackMax = Math.min(packLimit, 3);
  for (let count = 1; count <= defaultPackMax; count++) suggestions.push(count + "包");
  getAllowedQuickExitFractions_().forEach(function(fractionText) {
    if (isQuickExitFractionAllowed_(currentItem, segment, fractionText)) suggestions.push(fractionText);
  });
  return suggestions;
}

function dedupeQuickExitSuggestions_(values) {
  const seen = {};
  return values.filter(function(value) {
    const key = String(value || "");
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function buildQuickExitSuggestions_(item, segment, entry) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem || !segment) return [];
  const rawEntry = String(entry || "");
  const normalized = rawEntry.trim();
  const normalizedNumeric = /^\d+$/.test(normalized) ? Math.max(0, Math.trunc(Number(normalized) || 0)) : 0;
  const tailPiecesText = segment.id === "tail" ? String(Math.max(0, Math.trunc(Number(segment.availablePieces) || 0))) : "";
  const isTailNumericPrefixMatch = segment.id === "tail" && !!segment.label && normalizedNumeric > 0 && tailPiecesText.indexOf(String(normalizedNumeric)) === 0;
  const suggestions = getQuickExitDefaultSuggestions_(currentItem, segment).slice();
  if (!normalized) return dedupeQuickExitSuggestions_(suggestions);
  if (segment.id === "tail" && /^\($/.test(normalized) && segment.label) suggestions.unshift(segment.label);
  if (/^\d+$/.test(normalized)) {
    const numeric = Math.max(0, Math.trunc(Number(normalized) || 0));
    if (numeric > 0) {
      if (isTailNumericPrefixMatch) suggestions.unshift(segment.label);
      if (segment.id === "main" && numeric <= getQuickExitWholeBoxesLimit_(currentItem, segment)) suggestions.unshift(numeric + "箱");
      if (numeric <= getQuickExitPackLimit_(currentItem, segment)) suggestions.unshift(numeric + "包");
    }
  } else if (/^\d+包$/.test(normalized)) {
    const packCount = Math.max(0, Math.trunc(Number(normalized.replace(/[^\d]/g, "")) || 0));
    if (packCount > 0 && packCount <= getQuickExitPackLimit_(currentItem, segment)) suggestions.unshift(packCount + "包");
  } else if (segment.id === "main" && /^\d+箱$/.test(normalized)) {
    const boxCount = Math.max(0, Math.trunc(Number(normalized.replace(/[^\d]/g, "")) || 0));
    if (boxCount > 0 && boxCount <= getQuickExitWholeBoxesLimit_(currentItem, segment)) suggestions.unshift(boxCount + "箱");
  } else if (/^1\/?$/.test(normalized)) {
    ["1/2", "1/3", "1/4"].forEach(function(fractionText) { if (isQuickExitFractionAllowed_(currentItem, segment, fractionText)) suggestions.unshift(fractionText); });
  } else if (/^2\/?$/.test(normalized)) {
    ["2/3", "2/4"].forEach(function(fractionText) { if (isQuickExitFractionAllowed_(currentItem, segment, fractionText)) suggestions.unshift(fractionText); });
  } else if (/^3\/?$/.test(normalized) && isQuickExitFractionAllowed_(currentItem, segment, "3/4")) {
    suggestions.unshift("3/4");
  }
  const lower = normalized.toLowerCase();
  return dedupeQuickExitSuggestions_(suggestions).filter(function(suggestion) {
    if (!normalized) return true;
    if (isTailNumericPrefixMatch && suggestion === segment.label) return true;
    return suggestion.toLowerCase().indexOf(lower) === 0;
  }).filter(function(suggestion) {
    const result = parseQuickExitSegmentEntry_(currentItem, segment, { entry: suggestion });
    return !!(result && result.valid);
  });
}

function parseQuickExitSegmentEntry_(item, segment, config) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem || !segment || !config) return { valid: false, pieces: 0, message: "" };
  const unitsPerBox = Math.max(0, Math.trunc(Number(currentItem.unitsPerBox) || 0));
  const colisage = Math.max(0, Math.trunc(Number(currentItem.colisage) || 0));
  const rawEntry = normalizeQuickExitEntry_(config.entry);
  if (!rawEntry) {
    return { valid: false, pieces: 0, message: 'Format invalide. Utilise 2箱, 5包, 1/2 ou ' + (segment.id === "tail" ? segment.label : "une valeur explicite") + '.' };
  }
  if (segment.id === "tail" && rawEntry === segment.label) return { valid: true, pieces: segment.availablePieces, mode: "tail-clear", message: "" };
  const boxMatch = rawEntry.match(/^(\d+)箱$/);
  if (boxMatch) {
    if (segment.id !== "main") return { valid: false, pieces: 0, message: "Valeur non autorisee pour 尾箱." };
    const boxCount = Math.max(0, Math.trunc(Number(boxMatch[1]) || 0));
    const maxBoxes = getQuickExitWholeBoxesLimit_(currentItem, segment);
    if (!(boxCount > 0) || !(unitsPerBox > 0) || boxCount > maxBoxes) return { valid: false, pieces: 0, message: "Format invalide. Utilise 2箱, 5包 ou 1/2." };
    return { valid: true, pieces: unitsPerBox * boxCount, mode: "boxes", value: boxCount, message: "" };
  }
  const packMatch = rawEntry.match(/^(\d+)包$/);
  if (packMatch) {
    const packCount = Math.max(0, Math.trunc(Number(packMatch[1]) || 0));
    const maxPacks = getQuickExitPackLimit_(currentItem, segment);
    if (!(colisage > 0) || !(packCount > 0) || packCount > maxPacks) {
      return { valid: false, pieces: 0, message: segment.id === "tail" ? "Valeur non autorisee pour 尾箱." : "Format invalide. Utilise 2箱, 5包 ou 1/2." };
    }
    return { valid: true, pieces: colisage * packCount, mode: "packs", value: packCount, message: "" };
  }
  const fractionPieces = getQuickExitFractionPieces_(currentItem, segment, rawEntry);
  if (fractionPieces > 0) return { valid: true, pieces: fractionPieces, mode: "fraction", fractionText: rawEntry, message: "" };
  return { valid: false, pieces: 0, message: segment.id === "tail" ? "Valeur non autorisee pour 尾箱." : "Format invalide. Utilise 2箱, 5包 ou 1/2." };
}

function getQuickExitSegmentElements_(segmentId) {
  const els = getQuickEditElements();
  if (!els.quickExitSegmentForms) return {};
  return {
    input: els.quickExitSegmentForms.querySelector('[data-quick-exit-field="entry"][data-segment-id="' + segmentId + '"]'),
    dropdown: els.quickExitSegmentForms.querySelector('[data-quick-exit-dropdown="' + segmentId + '"]'),
    error: els.quickExitSegmentForms.querySelector('[data-quick-exit-error="' + segmentId + '"]')
  };
}

function setQuickExitDropdownScrollLock_(isLocked) {
  const body = document.getElementById("quickEditBody");
  if (!body) return;
  body.classList.toggle("dropdown-open", !!isLocked);
  body.classList.toggle("overflow-hidden", !!isLocked);
  body.classList.toggle("overflow-y-auto", !isLocked);
}

function clearQuickExitDropdownLayer_() {
  const els = getQuickEditElements();
  const layer = document.getElementById("quickExitDropdownLayer");
  if (!layer) return;
  layer.innerHTML = "";
  layer.classList.add("hidden");
  layer.removeAttribute("data-segment-id");
  setQuickExitDropdownScrollLock_(false);
}

function renderQuickExitSegmentDropdown_(segmentId) {
  const els = getQuickEditElements();
  const segmentMap = getQuickExitSegmentMap_();
  const segment = segmentMap[segmentId];
  const config = getQuickExitSelectionConfig_(segmentId);
  const controls = getQuickExitSegmentElements_(segmentId);
  const layer = document.getElementById("quickExitDropdownLayer");
  const panelWrap = document.getElementById("quickExitPanelWrap");
  const body = document.getElementById("quickEditBody");
  const footer = document.getElementById("quickEditFooter");
  if (!segment || !config || !controls.input || !layer || !panelWrap || !body || !footer) {
    clearQuickExitDropdownLayer_();
    return;
  }
  const suggestions = buildQuickExitSuggestions_(state.quickEditItem, segment, config.entry);
  const shouldOpen = !!config.dropdownOpen && suggestions.length > 0;
  if (!shouldOpen) {
    clearQuickExitDropdownLayer_();
    return;
  }
  const panelRect = panelWrap.getBoundingClientRect();
  const modalRect = els.quickEditModal ? els.quickEditModal.getBoundingClientRect() : panelRect;
  const footerRect = footer.getBoundingClientRect();
  const inputRect = controls.input.getBoundingClientRect();
  const maxVisibleRows = Math.min(suggestions.length, 5);
  const dropdownWidth = Math.max(160, Math.min(Math.round(inputRect.width), Math.round(panelRect.width)));
  const left = Math.max(0, Math.min(Math.round(inputRect.left - panelRect.left), Math.max(0, Math.round(panelRect.width - dropdownWidth))));
  const rowHeight = 40;
  const desiredHeight = Math.max(44, maxVisibleRows * rowHeight);
  const gap = 4;
  const maxBottom = Math.min(footerRect.top - panelRect.top - gap, modalRect.bottom - panelRect.top - 12);
  const top = Math.max(0, Math.round(inputRect.bottom - panelRect.top + gap));
  const spaceBelow = Math.max(0, maxBottom - top);
  const maxHeight = Math.max(32, Math.min(desiredHeight, spaceBelow));
  const highlightedIndex = Math.max(-1, Math.min(Number(config.highlightedIndex || -1), suggestions.length - 1));
  layer.innerHTML = '<div class="pointer-events-auto absolute overflow-y-auto rounded border border-outline-variant/40 bg-surface-container-lowest shadow-[0_16px_32px_rgba(11,15,16,0.24)]" style="left:' + left + 'px;top:' + top + 'px;width:' + dropdownWidth + 'px;max-height:' + maxHeight + 'px;">'
    + suggestions.map(function(suggestion, index) {
      return '<button class="flex w-full items-center justify-between border-b border-outline-variant/10 px-3 py-2 text-left text-[12px] font-medium transition-colors duration-150 last:border-b-0 '
        + (index === highlightedIndex ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container')
        + '" data-quick-exit-suggestion="' + escapeHtml(suggestion) + '" data-segment-id="' + escapeHtml(segmentId) + '" type="button"><span>' + escapeHtml(suggestion) + '</span></button>';
    }).join("")
    + '</div>';
  layer.setAttribute("data-segment-id", segmentId);
  layer.classList.remove("hidden");
  setQuickExitDropdownScrollLock_(true);
}

function renderQuickExitSegmentError_(segmentId) {
  const controls = getQuickExitSegmentElements_(segmentId);
  if (!controls.error) return;
  const message = state.quickExitSegmentErrors && state.quickExitSegmentErrors[segmentId] ? state.quickExitSegmentErrors[segmentId] : "";
  controls.error.textContent = message || "";
  controls.error.classList.toggle("hidden", !message);
}

function renderQuickExitPreviewUi_() {
  const els = getQuickEditElements();
  const preview = computeQuickExitPreview();
  const shouldShow = !!state.quickEditOpen && state.quickEditTab === "quick-exit";
  els.quickExitPreviewWrap.classList.toggle("hidden", !shouldShow);
  els.quickExitPreview.textContent = preview || "-";
}

function renderQuickExitSegmentUi_(segmentId) {
  const els = getQuickEditElements();
  renderQuickExitSegmentDropdown_(segmentId);
  renderQuickExitSegmentError_(segmentId);
  if (els.quickExitSegmentFormsScroll && els.quickExitSegmentFormsScroll.scrollWidth <= els.quickExitSegmentFormsScroll.clientWidth + 1) {
    els.quickExitSegmentFormsScroll.scrollLeft = 0;
  }
}

function buildQuickExitResultState_(item) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem || !state.quickExitForm || !state.quickExitForm.segments) return null;
  if (state.quickExitClearSelected) {
    return { valid: true, nextState: buildQuickExitEmptyMainState_(currentItem, String(state.quickEditForm && state.quickEditForm.remark || "").trim()) };
  }
  return buildQuickExitComputedState_(currentItem, { strict: true });
}

function shouldOpenQuickExitDropdownOnFocus_(segmentId) {
  const segment = getQuickExitSegmentMap_()[segmentId];
  const config = getQuickExitSelectionConfig_(segmentId);
  if (!segment || !config) return false;
  const entry = String(config.entry || "").trim();
  if (!entry) return true;
  const parsed = parseQuickExitSegmentEntry_(state.quickEditItem, segment, config);
  return !(parsed && parsed.valid);
}

function getNextQuickExitHighlightedIndex_(currentIndex, suggestionsLength, direction) {
  const length = Math.max(0, Math.trunc(Number(suggestionsLength) || 0));
  if (!length) return -1;
  const rawIndex = currentIndex == null ? -1 : Number(currentIndex);
  const normalized = Math.max(-1, Math.min(Number.isFinite(rawIndex) ? rawIndex : -1, length - 1));
  if (direction === "down") return normalized < 0 ? 0 : Math.min(length - 1, normalized + 1);
  if (direction === "up") return normalized < 0 ? length - 1 : Math.max(0, normalized - 1);
  return normalized;
}

function setQuickExitSegmentConfig_(segmentId, patch) {
  const segments = getQuickExitSegmentMap_();
  const segment = segments[segmentId];
  if (!segment) return;
  ensureQuickExitForm_();
  const current = state.quickExitForm.segments[segmentId] || getDefaultQuickExitConfig_(segment);
  state.quickExitForm.segments[segmentId] = Object.assign({}, current, patch || {});
}

function updateQuickExitSegmentConfig_(segmentId, field, value) {
  setQuickExitSegmentConfig_(segmentId, {
    entry: String(value || ""),
    dropdownOpen: true,
    highlightedIndex: -1
  });
  resetQuickExitErrors_();
  renderQuickExitSegmentUi_(segmentId);
  renderQuickExitPreviewUi_();
}

function applyQuickExitSuggestionSelection_(segmentId, selectedValue) {
  const nextValue = String(selectedValue || "");
  const controls = getQuickExitSegmentElements_(segmentId);
  if (controls.input) controls.input.value = nextValue;
  setQuickExitSegmentConfig_(segmentId, { entry: nextValue, dropdownOpen: false, highlightedIndex: -1 });
  resetQuickExitErrors_();
  renderQuickExitSegmentUi_(segmentId);
  renderQuickExitPreviewUi_();
  if (controls.input) {
    controls.input.focus();
    const caret = nextValue.length;
    if (typeof controls.input.setSelectionRange === "function") controls.input.setSelectionRange(caret, caret);
  }
}

function resetQuickEditInlineWidths_() {
  [
    document.getElementById("quickEditTailRemoveSlot"),
    document.getElementById("quickEditTailRemoveJoinSlot"),
    document.getElementById("quickEditUnitsPerBoxRemoveSpacer"),
    document.getElementById("quickEditMultiplyRemoveSpacerSlot"),
    document.getElementById("quickEditItemBoxesRemoveSpacer"),
    document.getElementById("quickEditPartialRemoveSlot"),
    document.getElementById("quickEditRemoveMeasure")
  ].forEach(function(element) {
    if (element) element.style.width = "";
  });
}

function syncWidthPair_(sourceEl, targetEl) {
  if (!sourceEl || !targetEl) return;
  targetEl.style.width = "";
  if (targetEl.classList.contains("hidden") || sourceEl.classList.contains("hidden")) return;
  const width = sourceEl.offsetWidth;
  if (width) targetEl.style.width = width + "px";
}

function syncQuickEditOperatorSlots_() {
  syncWidthPair_(document.getElementById("quickEditTailJoinSlot"), document.getElementById("quickEditTailRemoveJoinSlot"));
  syncWidthPair_(document.getElementById("quickEditMultiplyJoinSlot"), document.getElementById("quickEditMultiplyRemoveSpacerSlot"));
}

function hasVisibleQuickEditRemove_() {
  const tailRemove = document.getElementById("quickEditTailRemove");
  const partialRemoveSlot = document.getElementById("quickEditPartialRemoveSlot");
  return !!(tailRemove && !tailRemove.classList.contains("hidden")) || !!(partialRemoveSlot && !partialRemoveSlot.classList.contains("hidden"));
}

function centerQuickEditMeasuredBlock_(scrollEl, measureEl, measuredWidth) {
  if (!scrollEl || !measureEl) return;
  const viewportWidth = scrollEl.clientWidth;
  const contentWidth = measuredWidth || 0;
  measureEl.style.marginLeft = "";
  measureEl.style.marginRight = "";
  if (viewportWidth > 0 && contentWidth > 0 && contentWidth <= viewportWidth + 1) {
    measureEl.style.marginLeft = "auto";
    measureEl.style.marginRight = "auto";
    if (scrollEl.scrollLeft !== 0) scrollEl.scrollLeft = 0;
    return;
  }
  if (scrollEl.scrollWidth <= scrollEl.clientWidth + 1 && scrollEl.scrollLeft !== 0) scrollEl.scrollLeft = 0;
}

function syncQuickEditMeasuredLayout_(retryCount) {
  const currentRetry = retryCount || 0;
  const expressionMeasure = document.getElementById("quickEditExpressionMeasure");
  const expressionScroll = document.getElementById("quickEditExpressionScroll");
  const removeCenterWrap = document.getElementById("quickEditRemoveCenterWrap");
  const removeMeasure = document.getElementById("quickEditRemoveMeasure");
  const removeScroll = document.getElementById("quickEditRemoveScroll");
  resetQuickEditInlineWidths_();
  syncWidthPair_(document.getElementById("quickEditTailSlot"), document.getElementById("quickEditTailRemoveSlot"));
  syncWidthPair_(document.getElementById("quickEditUnitsPerBoxSlot"), document.getElementById("quickEditUnitsPerBoxRemoveSpacer"));
  syncWidthPair_(document.getElementById("quickEditItemBoxesSlot"), document.getElementById("quickEditItemBoxesRemoveSpacer"));
  syncWidthPair_(document.getElementById("quickEditPartialSlot"), document.getElementById("quickEditPartialRemoveSlot"));
  syncQuickEditOperatorSlots_();
  const measuredWidth = expressionMeasure ? Math.round(expressionMeasure.getBoundingClientRect().width || 0) : 0;
  if (!(measuredWidth > 0)) {
    if (currentRetry < 2 && state.quickEditOpen) {
      window.requestAnimationFrame(function() {
        syncQuickEditMeasuredLayout_(currentRetry + 1);
      });
    }
    return;
  }
  positionQuickEditOperatorBetween_(document.getElementById("quickEditTailJoin"), getQuickEditAnchor_(document.getElementById("quickEditTail"), document.getElementById("quickEditTailToggle")), getQuickEditAnchor_(document.getElementById("quickEditUnitsPerBox"), null));
  positionQuickEditOperatorBetween_(document.getElementById("quickEditMultiplyJoin"), getQuickEditAnchor_(document.getElementById("quickEditUnitsPerBox"), null), getQuickEditAnchor_(document.getElementById("quickEditItemBoxes"), null));
  centerQuickEditMeasuredBlock_(expressionScroll, expressionMeasure, measuredWidth);
  if (removeCenterWrap && !removeCenterWrap.classList.contains("hidden") && hasVisibleQuickEditRemove_()) {
    removeMeasure.style.width = measuredWidth + "px";
    centerQuickEditMeasuredBlock_(removeScroll, removeMeasure, measuredWidth);
  } else if (removeMeasure && removeScroll) {
    removeMeasure.style.width = "";
    removeMeasure.style.marginLeft = "";
    removeMeasure.style.marginRight = "";
    removeScroll.scrollLeft = 0;
  }
}

function scheduleQuickEditMeasuredLayout_() {
  window.requestAnimationFrame(function() {
    window.requestAnimationFrame(function() {
      syncQuickEditMeasuredLayout_(0);
    });
  });
}

function syncQuickEditFieldWidths_() {
  const form = state.quickEditForm || {};
  setFieldWidth_(document.getElementById("quickEditTailSegment"), document.getElementById("quickEditTail"), form.tailInput, document.getElementById("quickEditTail").placeholder, 7, 12, 0);
  setFieldWidth_(document.getElementById("quickEditUnitsPerBoxField"), document.getElementById("quickEditUnitsPerBox"), form.unitsPerBoxInput, document.getElementById("quickEditUnitsPerBox").placeholder, 6, 10, 0);
  setFieldWidth_(document.getElementById("quickEditItemBoxesField"), document.getElementById("quickEditItemBoxes"), form.itemBoxes, "1", 6, 8, 1);
  setFieldWidth_(document.getElementById("quickEditSignField"), document.getElementById("quickEditSign"), sanitizeSign(form.sign), "+", 6, 7, 1);
  setFieldWidth_(document.getElementById("quickEditFractionTextField"), document.getElementById("quickEditFractionText"), form.fractionText, document.getElementById("quickEditFractionText").placeholder, 5, 7, 0);
  setFieldWidth_(document.getElementById("quickEditPackSignField"), document.getElementById("quickEditPackNotationSign"), form.packNotationSign, "+", 6, 7, 1);
  setFieldWidth_(document.getElementById("quickEditPackCountField"), document.getElementById("quickEditPackNotationCount"), form.packNotationCount, "0", 6, 8, 1);
  scheduleQuickEditMeasuredLayout_();
}

function syncQuickExitScrollableRow_(scrollEl, contentEl) {
  if (!scrollEl || !contentEl) return;
  if (contentEl.scrollWidth <= scrollEl.clientWidth + 1) scrollEl.scrollLeft = 0;
}

function buildQuickExitPacksHintMarkup(colisage, packsPerBox) {
  const safeColisage = Math.max(0, Math.trunc(Number(colisage) || 0));
  const safePacksPerBox = Math.max(0, Math.trunc(Number(packsPerBox) || 0));
  if (!(safeColisage > 0) || !(safePacksPerBox > 0)) return "";
  return ''
    + '<span class="font-semibold text-on-surface">' + escapeHtml(safeColisage) + '</span>'
    + '<span class="text-on-surface-variant">件/包</span>'
    + '<span class="text-on-surface-variant"> · </span>'
    + '<span class="text-on-surface-variant">1箱=</span>'
    + '<span class="font-semibold text-on-surface">' + escapeHtml(safePacksPerBox) + '</span>'
    + '<span class="text-on-surface-variant">包</span>';
}

function renderQuickEdit() {
  const els = getQuickEditElements();
  const isOpen = !!state.quickEditOpen && !!state.quickEditItem;
  els.quickEditOverlay.classList.toggle("hidden", !isOpen);
  els.quickEditOverlay.classList.toggle("flex", isOpen);
  if (!isOpen) {
    clearQuickExitDropdownLayer_();
    return;
  }

  const item = getItemById(state.quickEditItemId) || state.quickEditItem;
  if (!item) {
    closeQuickEdit();
    return;
  }

  state.quickEditItem = item;
  ensureQuickExitForm_();
  const form = state.quickEditForm || {};
  const isQuickExit = state.quickEditTab === "quick-exit";
  const infoState = isQuickExit ? item : (buildCurrentEditStateModel() || item);
  const packMeta = buildPackMeta(infoState || item);
  const packsEnabled = packMeta.packsPerBox > 0;
  const tailOpen = !!state.quickEditTailOpen;
  const showPartialGroup = !!state.quickEditPartialOpen;
  const showPartialToggle = !showPartialGroup;

  els.quickEditReference.textContent = item.reference || "-";
  els.quickEditStockDisplay.textContent = item.stockDisplay || "-";
  els.quickEditTail.value = form.tailInput || "";
  els.quickEditUnitsPerBox.value = form.unitsPerBoxInput || "";
  els.quickEditItemBoxes.value = form.itemBoxes || "";
  if (els.quickEditSign) els.quickEditSign.value = showPartialGroup ? (sanitizeSign(form.sign) || "+") : "+";
  if (els.quickEditFractionText) els.quickEditFractionText.value = form.fractionText || "";
  if (els.quickEditPackNotationSign) els.quickEditPackNotationSign.value = showPartialGroup ? (form.packNotationSign || "+") : "+";
  if (els.quickEditPackNotationCount) els.quickEditPackNotationCount.value = form.packNotationCount || "";
  els.quickEditRemark.value = form.remark || "";
  els.quickEditTabQuickExit.className = "border px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] " + (isQuickExit ? "border-primary bg-primary text-on-primary" : "border-outline-variant/30 text-on-surface-variant");
  els.quickEditTabEdit.className = "border px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] " + (!isQuickExit ? "border-primary bg-primary text-on-primary" : "border-outline-variant/30 text-on-surface-variant");
  els.quickExitPanelWrap.classList.toggle("hidden", !isQuickExit);
  els.quickExitPanel.classList.toggle("hidden", !isQuickExit);
  if (!isQuickExit) clearQuickExitDropdownLayer_();
  els.quickEditForm.classList.toggle("hidden", isQuickExit);
  els.quickEditTailToggle.classList.toggle("hidden", tailOpen);
  els.quickEditTailGroup.classList.toggle("hidden", !tailOpen);
  els.quickEditTailGroup.classList.toggle("flex", tailOpen);
  els.quickEditTailJoinSlot.classList.toggle("hidden", !tailOpen);
  els.quickEditTailRemove.classList.toggle("hidden", !tailOpen);
  els.quickEditTailRemoveSlot.classList.toggle("pointer-events-none", !tailOpen);
  els.quickEditTailRemoveJoinSlot.classList.toggle("hidden", !tailOpen);
  els.quickEditPartialToggle.classList.toggle("hidden", !showPartialToggle);
  els.quickEditPartialGroup.classList.toggle("hidden", !showPartialGroup);
  els.quickEditPartialRemoveSlot.classList.toggle("hidden", !showPartialGroup);
  els.quickEditTailToggleIcon.textContent = "add";
  els.quickEditPartialToggleIcon.textContent = "add";
  els.quickEditPackNotationSign.disabled = false;
  els.quickEditPackNotationCount.disabled = false;
  els.quickEditPartialGroup.classList.remove("opacity-60");
  els.quickEditPartialToggle.classList.remove("opacity-60");
  els.quickExitClearButton.className = "shrink-0 rounded border px-2 py-1 text-[10px] font-bold tracking-[0.12em] transition-colors duration-150 "
    + (state.quickExitClearSelected
      ? "border-primary bg-primary text-on-primary"
      : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container");
  els.quickExitCurrentStock.innerHTML = renderQuickExitSegmentsMarkup_(item);
  renderQuickExitSegmentForms_(item);
  syncQuickExitScrollableRow_(els.quickExitCurrentStockScroll, els.quickExitCurrentStock);
  renderQuickExitPreviewUi_();
  els.quickExitPacksHint.classList.toggle("hidden", !packsEnabled);
  if (els.quickExitPacksHintText) els.quickExitPacksHintText.textContent = "";
  els.quickExitPacksHint.innerHTML = packsEnabled ? buildQuickExitPacksHintMarkup(item.colisage, packMeta.packsPerBox) : "";
  els.quickEditMessage.classList.toggle("hidden", !state.quickEditError);
  els.quickEditMessage.textContent = state.quickEditError || "";
  els.quickEditSave.textContent = isQuickExit ? "APPLIQUER LA SORTIE" : "ENREGISTRER";
  els.quickEditSave.disabled = state.quickEditSaving;
  els.quickEditCancel.disabled = state.quickEditSaving;
  els.quickEditRemoveCenterWrap.classList.toggle("hidden", !(tailOpen || showPartialGroup));
  syncQuickEditFieldWidths_();
}

function replaceItem(nextItem) {
  state.items = state.items.map(function(item) {
    return item.id === nextItem.id ? nextItem : item;
  });
}

function openQuickEdit(item) {
  if (!item) return;
  state.quickEditItem = item;
  state.quickEditItemId = item.id;
  state.quickEditOpen = true;
  state.quickEditTab = "quick-exit";
  state.quickEditSaving = false;
  setQuickEditError("");
  const packNotationParts = splitPackNotation(item.packNotation);
  state.quickEditForm = {
    tailInput: formatTailDisplay(item.tail),
    unitsPerBoxInput: formatUnitsPerBoxDisplay(item.unitsPerBox),
    itemBoxes: sanitizeIntegerInput(item.itemBoxes),
    sign: sanitizeSign(item.sign),
    fractionText: sanitizeFractionText(item.fractionText),
    packNotationSign: packNotationParts.sign,
    packNotationCount: packNotationParts.count,
    remark: String(item.remark || "").trim()
  };
  state.quickEditTailOpen = hasQuickEditTailValue(state.quickEditForm);
  state.quickEditPartialOpen = hasQuickEditPartialValue(state.quickEditForm);
  state.quickExitForm = { segments: {} };
  state.quickExitClearSelected = false;
  state.quickExitSegmentErrors = {};
  renderQuickEdit();
}

function closeQuickEdit() {
  const els = getQuickEditElements();
  resetQuickEditInlineWidths_();
  if (els.quickEditExpressionMeasure) {
    els.quickEditExpressionMeasure.style.marginLeft = "";
    els.quickEditExpressionMeasure.style.marginRight = "";
  }
  if (els.quickEditRemoveMeasure) {
    els.quickEditRemoveMeasure.style.marginLeft = "";
    els.quickEditRemoveMeasure.style.marginRight = "";
  }
  if (els.quickEditExpressionScroll) els.quickEditExpressionScroll.scrollLeft = 0;
  if (els.quickEditRemoveScroll) els.quickEditRemoveScroll.scrollLeft = 0;
  state.quickEditOpen = false;
  state.quickEditItemId = "";
  state.quickEditItem = null;
  state.quickEditForm = null;
  state.quickEditTailOpen = false;
  state.quickEditPartialOpen = false;
  state.quickExitForm = null;
  state.quickExitClearSelected = false;
  state.quickExitSegmentErrors = {};
  state.quickEditError = "";
  state.quickEditSaving = false;
  renderQuickEdit();
}

function toggleQuickEditSegment(segment) {
  if (!state.quickEditForm) return;
  if (segment === "tail") state.quickEditTailOpen = !state.quickEditTailOpen;
  if (segment === "partial") {
    const nextOpen = !state.quickEditPartialOpen;
    state.quickEditPartialOpen = nextOpen;
    if (nextOpen) {
      if (!sanitizeSign(state.quickEditForm.sign)) state.quickEditForm.sign = "+";
      if (!String(state.quickEditForm.packNotationSign || "").trim()) state.quickEditForm.packNotationSign = "+";
    }
  }
  renderQuickEdit();
}

function handleQuickEditFieldChange(field, value) {
  if (!state.quickEditForm) return;
  if (field === "tailInput" || field === "unitsPerBoxInput") {
    state.quickEditForm[field] = String(value || "");
  } else if (field === "packNotationSign") {
    state.quickEditForm.packNotationSign = String(value || "") === "-" ? "-" : "+";
  } else if (field === "packNotationCount") {
    state.quickEditForm.packNotationCount = sanitizeIntegerInput(value);
  } else if (field === "remark") {
    state.quickEditForm.remark = String(value || "");
  } else if (field === "sign") {
    state.quickEditForm.sign = sanitizeSign(value);
  } else if (field === "fractionText") {
    state.quickEditForm.fractionText = sanitizeFractionText(value);
  } else {
    state.quickEditForm[field] = sanitizeIntegerInput(value);
  }
  setQuickEditError("");
  renderQuickEdit();
}

function validateEditPayload() {
  if (!state.quickEditItem || !state.quickEditForm) return null;
  const tailResult = parseStyledIntegerInput(state.quickEditForm.tailInput, { mode: "tail" });
  const unitsResult = parseStyledIntegerInput(state.quickEditForm.unitsPerBoxInput, { mode: "units" });
  const itemBoxes = Number(state.quickEditForm.itemBoxes || 0);
  const fractionText = sanitizeFractionText(state.quickEditForm.fractionText);
  const packNotation = buildPackNotationFromParts(state.quickEditForm.packNotationSign, state.quickEditForm.packNotationCount, "");
  const remark = String(state.quickEditForm.remark || "").trim();
  if (!tailResult.valid) {
    setQuickEditError("尾箱 invalide. Exemple attendu: (85p).");
    return null;
  }
  if (!unitsResult.valid) {
    setQuickEditError("件/箱 invalide. Exemple attendu: 144p.");
    return null;
  }
  if (!isFractionTextValid(fractionText)) {
    setQuickEditError("Fraction invalide. Exemple attendu: 1/2.");
    return null;
  }
  return {
    id: state.quickEditItem.id,
    reference: state.quickEditItem.reference,
    mode: "edit",
    tail: tailResult.value,
    unitsPerBox: unitsResult.value,
    itemBoxes: Math.max(0, Math.trunc(Number.isFinite(itemBoxes) ? itemBoxes : 0)),
    sign: sanitizeSign(state.quickEditForm.sign),
    fractionText: fractionText,
    packNotationSign: state.quickEditForm.packNotationSign,
    packNotationCount: Math.max(0, Math.trunc(Number(state.quickEditForm.packNotationCount) || 0)),
    packNotation: packNotation,
    remark: remark
  };
}

function validateQuickExitPayload(item) {
  const currentItem = item || state.quickEditItem;
  if (!currentItem) return null;
  if (state.quickExitClearSelected) {
    resetQuickExitErrors_();
    return {
      id: currentItem.id,
      reference: currentItem.reference,
      mode: "edit",
      tail: 0,
      unitsPerBox: Math.max(0, Math.trunc(Number(currentItem.unitsPerBox) || 0)),
      itemBoxes: 0,
      sign: "",
      fractionText: "",
      packNotationSign: "+",
      packNotationCount: 0,
      packNotation: "",
      remark: String(state.quickEditForm && state.quickEditForm.remark || "").trim(),
      fractionValue: 0
    };
  }
  if (!state.quickExitForm) return null;
  const result = buildQuickExitResultState_(currentItem);
  if (!result || !result.valid || !result.nextState) {
    state.quickExitSegmentErrors = result && result.segmentErrors ? result.segmentErrors : {};
    setQuickEditError(result && result.message ? result.message : "Selectionne au moins un segment de sortie.");
    return null;
  }
  state.quickExitSegmentErrors = {};
  const nextState = result.nextState;
  const nextMeta = buildPackMeta(nextState);
  const packSplit = splitPackNotation(nextState.packNotation);
  return {
    id: currentItem.id,
    reference: currentItem.reference,
    mode: "edit",
    tail: Math.max(0, Math.trunc(Number(nextState.tail) || 0)),
    unitsPerBox: Math.max(0, Math.trunc(Number(nextState.unitsPerBox) || 0)),
    itemBoxes: Math.max(0, Math.trunc(Number(nextState.itemBoxes) || 0)),
    sign: sanitizeSign(nextState.sign),
    fractionText: sanitizeFractionText(nextState.fractionText),
    packNotationSign: packSplit.sign,
    packNotationCount: Math.max(0, Math.trunc(Number(packSplit.count) || 0)),
    packNotation: normalizePackNotation(nextState.packNotation, false),
    remark: String(state.quickEditForm && state.quickEditForm.remark || "").trim(),
    packsPerBox: nextMeta.packsPerBox
  };
}

function buildOptimisticItemFromRequest(baseItem, request) {
  if (!baseItem || !request) return null;
  const nextFractionText = sanitizeFractionText(request.fractionText);
  const nextItem = Object.assign({}, baseItem, {
    tail: Math.max(0, Math.trunc(Number(request.tail) || 0)),
    unitsPerBox: Math.max(0, Math.trunc(Number(request.unitsPerBox) || 0)),
    itemBoxes: Math.max(0, Math.trunc(Number(request.itemBoxes) || 0)),
    sign: String(request.sign || "").trim() ? sanitizeSign(request.sign) : "",
    fractionText: nextFractionText,
    fractionValue: parseFractionValue(nextFractionText),
    packNotation: normalizePackNotation(request.packNotation, false),
    remark: String(request.remark || "").trim()
  });
  return hydrateItem(nextItem);
}

function handleQuickEditSave() {
  if (state.quickEditSaving) return;
  const request = state.quickEditTab === "quick-exit" ? validateQuickExitPayload() : validateEditPayload();
  if (!request) {
    renderQuickEdit();
    return;
  }
  const currentItem = getItemById(request.id) || state.quickEditItem;
  if (!currentItem) {
    setQuickEditError("Reference introuvable. Merci de rafraichir.");
    renderQuickEdit();
    return;
  }
  const optimisticItem = buildOptimisticItemFromRequest(currentItem, request);
  if (!optimisticItem) {
    setQuickEditError("Impossible de calculer la mise a jour locale.");
    renderQuickEdit();
    return;
  }
  request.localActionType = state.quickEditTab === "quick-exit" ? "exit" : "adjustment";
  state.quickEditSaving = true;
  const result = dataSource.saveQuickEdit(request);
  hasLocalWritesThisSession = true;
  state.items = Array.isArray(result.items) ? result.items : state.items;
  state.historyItems = Array.isArray(result.historyItems) ? result.historyItems : state.historyItems;
  applyDataMeta(result.meta);
  closeQuickEdit();
  renderAll();
  if (navigator.onLine) {
    syncPendingMutations({ silent: true });
  }
}

function bindQuickEditEvents() {
  const els = getQuickEditElements();
  if (!els.quickEditOverlay) return;
  els.quickEditTabQuickExit.addEventListener("click", function() {
    state.quickEditTab = "quick-exit";
    setQuickEditError("");
    renderQuickEdit();
  });
  els.quickEditTabEdit.addEventListener("click", function() {
    state.quickEditTab = "edit";
    setQuickEditError("");
    renderQuickEdit();
  });
  els.quickExitClearButton.addEventListener("click", function() {
    setQuickExitClearSelected_(!state.quickExitClearSelected);
    renderQuickEdit();
  });
  els.quickExitCurrentStock.addEventListener("click", function(event) {
    const trigger = event.target.closest("[data-quick-exit-segment]");
    if (!trigger) return;
    toggleQuickExitSegment_(trigger.getAttribute("data-quick-exit-segment"));
  });
  els.quickExitSegmentForms.addEventListener("input", function(event) {
    const field = event.target.getAttribute("data-quick-exit-field");
    const segmentId = event.target.getAttribute("data-segment-id");
    if (!field || !segmentId) return;
    updateQuickExitSegmentConfig_(segmentId, field, event.target.value);
  });
  els.quickExitSegmentForms.addEventListener("focusin", function(event) {
    const segmentId = event.target.getAttribute("data-segment-id");
    if (!segmentId) return;
    ensureQuickExitForm_();
    const shouldOpen = shouldOpenQuickExitDropdownOnFocus_(segmentId);
    Object.keys(state.quickExitForm.segments || {}).forEach(function(key) {
      if (key !== segmentId && state.quickExitForm.segments[key]) {
        state.quickExitForm.segments[key] = Object.assign({}, state.quickExitForm.segments[key], { dropdownOpen: false, highlightedIndex: -1 });
      }
    });
    setQuickExitSegmentConfig_(segmentId, { dropdownOpen: shouldOpen, highlightedIndex: -1 });
    renderQuickExitSegmentUi_(segmentId);
  });
  els.quickExitSegmentForms.addEventListener("focusout", function(event) {
    const segmentId = event.target.getAttribute("data-segment-id");
    if (!segmentId) return;
    window.setTimeout(function() {
      const active = document.activeElement;
      const activeSegmentId = active && active.getAttribute ? active.getAttribute("data-segment-id") : "";
      if (activeSegmentId === segmentId) return;
      setQuickExitSegmentConfig_(segmentId, { dropdownOpen: false, highlightedIndex: -1 });
      if (activeSegmentId) {
        renderQuickExitSegmentUi_(activeSegmentId);
        return;
      }
      renderQuickExitSegmentUi_(segmentId);
    }, 0);
  });
  els.quickExitSegmentForms.addEventListener("keydown", function(event) {
    const segmentId = event.target.getAttribute("data-segment-id");
    if (!segmentId) return;
    const segment = getQuickExitSegmentMap_()[segmentId];
    const config = getQuickExitSelectionConfig_(segmentId);
    if (!segment || !config) return;
    const suggestions = buildQuickExitSuggestions_(state.quickEditItem, segment, config.entry);
    if (!suggestions.length) {
      if (event.key === "Escape") {
        setQuickExitSegmentConfig_(segmentId, { dropdownOpen: false, highlightedIndex: -1 });
        renderQuickExitSegmentUi_(segmentId);
      }
      return;
    }
    const currentIndex = getNextQuickExitHighlightedIndex_(config.highlightedIndex, suggestions.length, "noop");
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setQuickExitSegmentConfig_(segmentId, { dropdownOpen: true, highlightedIndex: getNextQuickExitHighlightedIndex_(currentIndex, suggestions.length, "down") });
      renderQuickExitSegmentUi_(segmentId);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setQuickExitSegmentConfig_(segmentId, { dropdownOpen: true, highlightedIndex: getNextQuickExitHighlightedIndex_(currentIndex, suggestions.length, "up") });
      renderQuickExitSegmentUi_(segmentId);
    } else if (event.key === "Enter" && config.dropdownOpen && currentIndex >= 0 && suggestions[currentIndex]) {
      event.preventDefault();
      applyQuickExitSuggestionSelection_(segmentId, suggestions[currentIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setQuickExitSegmentConfig_(segmentId, { dropdownOpen: false, highlightedIndex: -1 });
      renderQuickExitSegmentUi_(segmentId);
    }
  });
  els.quickExitSegmentForms.addEventListener("mousedown", function(event) {
    const trigger = event.target.closest("[data-quick-exit-suggestion]");
    if (!trigger) return;
    event.preventDefault();
  });
  els.quickExitSegmentForms.addEventListener("click", function(event) {
    const trigger = event.target.closest("[data-quick-exit-suggestion]");
    if (!trigger) return;
    applyQuickExitSuggestionSelection_(trigger.getAttribute("data-segment-id"), trigger.getAttribute("data-quick-exit-suggestion"));
  });
  els.quickExitDropdownLayer.addEventListener("mousedown", function(event) {
    const trigger = event.target.closest("[data-quick-exit-suggestion]");
    if (!trigger) return;
    event.preventDefault();
  });
  els.quickExitDropdownLayer.addEventListener("click", function(event) {
    const trigger = event.target.closest("[data-quick-exit-suggestion]");
    if (!trigger) return;
    applyQuickExitSuggestionSelection_(trigger.getAttribute("data-segment-id"), trigger.getAttribute("data-quick-exit-suggestion"));
  });
  els.quickEditTail.addEventListener("input", function(event) {
    handleQuickEditFieldChange("tailInput", event.target.value);
  });
  els.quickEditUnitsPerBox.addEventListener("input", function(event) {
    handleQuickEditFieldChange("unitsPerBoxInput", event.target.value);
  });
  els.quickEditItemBoxes.addEventListener("input", function(event) {
    handleQuickEditFieldChange("itemBoxes", event.target.value);
  });
  els.quickEditSignField.addEventListener("change", function(event) {
    handleQuickEditFieldChange("sign", event.target.value);
  });
  els.quickEditFractionTextField.addEventListener("input", function(event) {
    handleQuickEditFieldChange("fractionText", event.target.value);
  });
  els.quickEditPackSignField.addEventListener("change", function(event) {
    handleQuickEditFieldChange("packNotationSign", event.target.value);
  });
  els.quickEditPackCountField.addEventListener("input", function(event) {
    handleQuickEditFieldChange("packNotationCount", event.target.value);
  });
  els.quickEditTailToggle.addEventListener("click", function() {
    toggleQuickEditSegment("tail");
  });
  els.quickEditTailRemove.addEventListener("click", function() {
    toggleQuickEditSegment("tail");
  });
  els.quickEditPartialToggle.addEventListener("click", function() {
    toggleQuickEditSegment("partial");
  });
  els.quickEditPartialRemove.addEventListener("click", function() {
    toggleQuickEditSegment("partial");
  });
  els.quickEditRemark.addEventListener("input", function(event) {
    handleQuickEditFieldChange("remark", event.target.value);
  });
  els.quickEditCancel.addEventListener("click", function() {
    closeQuickEdit();
  });
  els.quickEditSave.addEventListener("click", function() {
    handleQuickEditSave();
  });
  els.quickEditOverlay.addEventListener("click", function(event) {
    if (event.target === els.quickEditOverlay) closeQuickEdit();
  });
  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && state.quickEditOpen) closeQuickEdit();
  });
  if (typeof ResizeObserver === "function") {
    quickEditLayoutObserver_ = new ResizeObserver(function() {
      if (state.quickEditOpen) scheduleQuickEditMeasuredLayout_();
    });
    [
      els.quickEditModal,
      els.quickEditExpressionMeasure,
      els.quickEditTailSlot,
      els.quickEditItemBoxesSlot,
      els.quickEditPartialSlot
    ].forEach(function(element) {
      if (element) quickEditLayoutObserver_.observe(element);
    });
  }
}

function renderInventoryPage() {
  const searchInput = document.getElementById("searchInput");
  const stockFilter = document.getElementById("inventoryStockFilter");
  const sortSelect = document.getElementById("inventorySortSelect");
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
  if (stockFilter) stockFilter.value = state.inventoryStockFilter;
  if (sortSelect) sortSelect.value = state.inventorySort;
  const items = filterInventoryItems(state.query);
  const columns = buildColumnLayout_(items, state.columnCount);
  const summary = getInventorySummary(items);
  inventoryGrid.innerHTML = renderColumnLayoutMarkup(columns);
  emptyState.classList.toggle("hidden", items.length > 0);
  summaryDate.textContent = formatDateLabel(new Date().toISOString());
  summaryRefs.textContent = summary.visibleCount + " " + (summary.visibleCount === 1 ? "ref" : "refs");
  summaryPositive.textContent = summary.positiveCount + " en stock";
  summaryZero.textContent = summary.zeroCount + " en rupture";
  summaryTotals.textContent = formatMetricNumber(summary.totalBoxes) + "箱 " + formatMetricNumber(summary.totalPieces) + "件";
  if (networkStatus) networkStatus.textContent = navigator.onLine ? "En ligne" : "Hors ligne";
  summaryStatus.textContent = getSyncStatusLabel(state.query ? "Recherche" : "Pret");
  if (refreshButton && !refreshButton.dataset.bound) {
    refreshButton.dataset.bound = "true";
    refreshButton.addEventListener("click", function() {
      refreshRemoteSnapshot({ force: false });
    });
  }
}

function renderHistoryPage() {
  const searchInput = document.getElementById("historySearchInput");
  const actionTypeFilter = document.getElementById("historyActionTypeFilter");
  const periodFilter = document.getElementById("historyPeriodFilter");
  const historyRefreshButton = document.getElementById("historyRefreshButton");
  const historyStatus = document.getElementById("historyStatus");
  const historyList = document.getElementById("historyList");
  const historyEmptyState = document.getElementById("historyEmptyState");
  const historyEmptyTitle = document.getElementById("historyEmptyTitle");
  const historyEmptyMessage = document.getElementById("historyEmptyMessage");
  if (!searchInput || !historyList) return;

  searchInput.value = state.historyQuery;
  actionTypeFilter.value = state.historyActionType;
  if (periodFilter) periodFilter.value = state.historyPeriod;
  const items = filterHistoryItems(state.historyQuery, state.historyActionType, state.historyPeriod);
  const hasFilters = !!(state.historyQuery || state.historyActionType || (state.historyPeriod && state.historyPeriod !== "all"));
  historyList.innerHTML = renderHistoryListMarkup(items);
  historyStatus.textContent = getSyncStatusLabel(hasFilters ? "Filtré" : "Pret");
  historyEmptyState.classList.toggle("hidden", items.length > 0);
  historyEmptyTitle.textContent = hasFilters ? "Aucun resultat" : "Aucun historique";
  historyEmptyMessage.textContent = hasFilters ? "Aucun mouvement ne correspond à la recherche." : "Aucun mouvement à afficher.";
  if (historyRefreshButton && !historyRefreshButton.dataset.bound) {
    historyRefreshButton.dataset.bound = "true";
    historyRefreshButton.addEventListener("click", function() {
      refreshRemoteSnapshot({ force: false });
    });
  }
}

function renderDetailPage() {
  const detailReference = document.getElementById("detailReference");
  const detailSubline = document.getElementById("detailSubline");
  const detailPrimaryReference = document.getElementById("detailPrimaryReference");
  const detailNotFoundBanner = document.getElementById("detailNotFoundBanner");
  const detailMainSection = document.getElementById("detailMainSection");
  const detailStockDisplay = document.getElementById("detailStockDisplay");
  const detailStockState = document.getElementById("detailStockState");
  const detailWarehouse = document.getElementById("detailWarehouse");
  const detailCreatedAt = document.getElementById("detailCreatedAt");
  const detailLastMovement = document.getElementById("detailLastMovement");
  const detailSummary = document.getElementById("detailSummary");
  const detailStockStateSection = document.getElementById("detailStockStateSection");
  const detailStockStateTable = document.getElementById("detailStockStateTable");
  const detailRemarkSection = document.getElementById("detailRemarkSection");
  const detailRemark = document.getElementById("detailRemark");
  const detailHistoryList = document.getElementById("detailHistoryList");
  const detailHistoryEmpty = document.getElementById("detailHistoryEmpty");
  const detailQuickEditButton = document.getElementById("detailQuickEditButton");
  if (!detailReference) return;

  const reference = state.detailReference;
  state.detailReference = reference;
  const detailResult = dataSource ? dataSource.loadDetail(reference) : { item: null, history: [], notFoundInStock: true };
  const item = detailResult.item;
  if (!item) {
    detailReference.textContent = "Fiche produit";
    detailSubline.textContent = reference || "-";
    if (detailPrimaryReference) detailPrimaryReference.textContent = reference || "-";
    detailNotFoundBanner.classList.remove("hidden");
    detailMainSection.classList.add("hidden");
    if (detailStockStateSection) detailStockStateSection.classList.add("hidden");
    detailRemarkSection.classList.add("hidden");
    detailHistoryList.innerHTML = "";
    detailHistoryEmpty.classList.remove("hidden");
    if (detailQuickEditButton) detailQuickEditButton.classList.add("hidden");
    return;
  }

  const itemHistory = Array.isArray(detailResult.history) ? detailResult.history : [];
  detailReference.textContent = "Fiche produit";
  detailSubline.textContent = item.reference || "-";
  if (detailPrimaryReference) detailPrimaryReference.textContent = item.reference || "-";
  detailStockDisplay.textContent = item.stockDisplay || "-";
  detailStockState.textContent = item.stockState === "positive" ? "En stock" : "En rupture";
  detailWarehouse.textContent = item.warehouse || "-";
  detailCreatedAt.textContent = item.createdAt || "-";
  detailLastMovement.textContent = itemHistory.length ? (itemHistory[0].timestampLabel || formatHistoryTimestamp(itemHistory[0].timestampRaw)) : "-";
  detailSummary.textContent = getArrivalNote(item);
  if (detailStockStateTable) detailStockStateTable.innerHTML = renderDetailStockStateMarkup(item);
  detailNotFoundBanner.classList.add("hidden");
  detailMainSection.classList.remove("hidden");
  if (detailStockStateSection) detailStockStateSection.classList.remove("hidden");
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

function syncActiveShell() {
  const inventoryShell = document.getElementById("inventoryAppShell");
  const historyShell = document.getElementById("historyAppShell");
  const detailShell = document.getElementById("detailAppShell");
  const navInventoryButton = document.getElementById("navInventoryButton");
  const navHistoryButton = document.getElementById("navHistoryButton");
  const view = state.currentView || "inventory";

  if (inventoryShell) inventoryShell.classList.toggle("hidden", view !== "inventory");
  if (historyShell) historyShell.classList.toggle("hidden", view !== "history");
  if (detailShell) detailShell.classList.toggle("hidden", view !== "detail");

  if (navInventoryButton) {
    const active = view === "inventory" || view === "detail";
    navInventoryButton.className = "flex flex-1 flex-col items-center justify-center px-2 py-1 " + (active ? "bg-slate-200 text-slate-900" : "text-slate-400");
    navInventoryButton.setAttribute("aria-current", active ? "page" : "false");
  }
  if (navHistoryButton) {
    const active = view === "history";
    navHistoryButton.className = "flex flex-1 flex-col items-center justify-center px-2 py-1 " + (active ? "bg-slate-200 text-slate-900" : "text-slate-400");
    navHistoryButton.setAttribute("aria-current", active ? "page" : "false");
  }
}

function syncColumnLayout(force) {
  const nextCount = getColumnCount();
  if (!force && nextCount === state.columnCount) return;
  state.columnCount = nextCount;
  renderInventoryPage();
}

function bindInventoryEvents() {
  const searchInput = document.getElementById("searchInput");
  const stockFilter = document.getElementById("inventoryStockFilter");
  const sortSelect = document.getElementById("inventorySortSelect");
  const inventoryGrid = document.getElementById("inventoryGrid");
  const navInventoryButton = document.getElementById("navInventoryButton");
  const navHistoryButton = document.getElementById("navHistoryButton");
  if (!searchInput || !inventoryGrid) return;
  searchInput.addEventListener("input", function(event) {
    state.query = String(event.target.value || "").trim();
    renderInventoryPage();
  });
  if (stockFilter) {
    stockFilter.addEventListener("change", function(event) {
      state.inventoryStockFilter = String(event.target.value || "").trim();
      renderInventoryPage();
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", function(event) {
      state.inventorySort = String(event.target.value || "reference").trim() || "reference";
      renderInventoryPage();
    });
  }
  if (navInventoryButton) {
    navInventoryButton.addEventListener("click", function() {
      navigateTo("inventory");
    });
  }
  if (navHistoryButton) {
    navHistoryButton.addEventListener("click", function() {
      navigateTo("history");
    });
  }
  inventoryGrid.addEventListener("click", function(event) {
    const trigger = event.target.closest('[data-action="open-quick-edit"]');
    if (!trigger) return;
    openQuickEdit(getItemById(trigger.getAttribute("data-item-id")));
  });
}

function bindHistoryEvents() {
  const searchInput = document.getElementById("historySearchInput");
  const actionTypeFilter = document.getElementById("historyActionTypeFilter");
  const periodFilter = document.getElementById("historyPeriodFilter");
  if (!searchInput || !actionTypeFilter) return;
  searchInput.addEventListener("input", function(event) {
    state.historyQuery = String(event.target.value || "").trim();
    renderHistoryPage();
  });
  actionTypeFilter.addEventListener("change", function(event) {
    state.historyActionType = String(event.target.value || "").trim();
    renderHistoryPage();
  });
  if (periodFilter) {
    periodFilter.addEventListener("change", function(event) {
      state.historyPeriod = String(event.target.value || "all").trim() || "all";
      renderHistoryPage();
    });
  }
}

function bindDetailEvents() {
  const detailBackButton = document.getElementById("detailBackButton");
  const detailQuickEditButton = document.getElementById("detailQuickEditButton");
  if (detailBackButton) {
    detailBackButton.addEventListener("click", function() {
      navigateTo(state.previousView || "inventory");
    });
  }
  if (detailQuickEditButton) {
    detailQuickEditButton.addEventListener("click", function() {
      const item = getInventoryByReference(state.detailReference);
      if (item) openQuickEdit(item);
    });
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./service-worker.js").catch(function(error) {
    console.warn("Service worker registration failed", error);
  });
}

function initApp() {
  dataSource = window.createLocalDataSource({
    hydrateItem: hydrateItem,
    normalizeReference: normalizeReference,
    formatHistoryTimestamp: formatHistoryTimestamp,
    buildOptimisticItemFromRequest: buildOptimisticItemFromRequest,
    buildHistoryEntryFromLocalChange: buildHistoryEntryFromLocalChange
  });
  remoteDataSource = window.createRemoteDataSource ? window.createRemoteDataSource() : null;
  const inventoryResult = dataSource.loadInventory();
  const historyResult = dataSource.loadHistory();
  state.items = Array.isArray(inventoryResult.items) ? inventoryResult.items : [];
  state.historyItems = Array.isArray(historyResult.items) ? historyResult.items : [];
  applyDataMeta(inventoryResult.meta);
  state.columnCount = getColumnCount();
  const route = parseCurrentRoute();
  state.currentView = route.view;
  state.previousView = route.view === "detail" ? "inventory" : route.view;
  state.detailReference = route.ref;
  bindInventoryEvents();
  bindHistoryEvents();
  bindDetailEvents();
  bindQuickEditEvents();
  syncActiveShell();
  renderAll();
  registerServiceWorker();
  refreshRemoteSnapshot({ silent: true }).then(function() {
    if (state.pendingMutations.length) {
      return syncPendingMutations({ silent: true });
    }
    return false;
  });
  if (state.currentView === "detail" && state.detailReference) {
    refreshRemoteDetail(state.detailReference, { silent: true });
  }

  let resizeTimer = 0;
  window.addEventListener("resize", function() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function() {
      syncColumnLayout(false);
    }, 100);
  });
  window.addEventListener("online", function() {
    renderAll();
    refreshRemoteSnapshot({ silent: true }).then(function() {
      if (state.pendingMutations.length) {
        return syncPendingMutations({ silent: true });
      }
      return false;
    }).then(function() {
      if (state.currentView === "detail" && state.detailReference) {
        return refreshRemoteDetail(state.detailReference, { silent: true });
      }
      return false;
    });
  });
  window.addEventListener("offline", function() {
    state.syncStatus = "offline";
    renderAll();
  });
  window.addEventListener("hashchange", handleRouteChange);
}

document.addEventListener("DOMContentLoaded", initApp);
