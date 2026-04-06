function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const route = String(params.route || "").trim().toLowerCase();

  try {
    if (route === "inventory") {
      return apiJson_(handleInventoryRoute_());
    }
    if (route === "history") {
      return apiJson_(handleHistoryRoute_());
    }
    if (route === "detail") {
      return apiJson_(handleDetailRoute_(params.reference || ""));
    }
    return apiError_("Route introuvable. Utilise route=inventory, route=history ou route=detail.", 404);
  } catch (error) {
    return apiError_(error && error.message ? error.message : "Erreur serveur inconnue.", 500);
  }
}

function handleInventoryRoute_() {
  const payload = StockWebAppV2_getInventory() || {};
  return Object.assign({}, payload, {
    items: Array.isArray(payload.items) ? payload.items : [],
    summary: payload.summary || {
      visibleCount: 0,
      positiveCount: 0,
      zeroCount: 0,
      totalRows: 0,
      isPartial: false,
      generatedAt: payload.generatedAt || new Date().toISOString()
    },
    filters: payload.filters || {},
    ui: payload.ui || {},
    generatedAt: payload.generatedAt || new Date().toISOString(),
    source: "google_sheets"
  });
}

function handleHistoryRoute_() {
  const payload = StockWebApp_getHistory({ loadAll: true }) || {};
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextOffset: Number(payload.nextOffset || 0),
    hasMore: !!payload.hasMore,
    totalMatched: Number(payload.totalMatched || 0),
    generatedAt: payload.generatedAt || new Date().toISOString(),
    source: "google_sheets"
  };
}

function handleDetailRoute_(reference) {
  const payload = StockWebApp_getItemDetail(reference, { historyLimit: 200 }) || {};
  return {
    item: payload.item || null,
    history: Array.isArray(payload.history) ? payload.history : [],
    nextHistoryOffset: Number(payload.nextHistoryOffset || 0),
    hasMoreHistory: !!payload.hasMoreHistory,
    generatedAt: payload.generatedAt || new Date().toISOString(),
    lastMovementAt: payload.lastMovementAt || "",
    notFoundInStock: !!payload.notFoundInStock,
    source: "google_sheets"
  };
}

function apiJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function apiError_(message, status) {
  return apiJson_({
    error: true,
    status: Number(status || 500),
    message: String(message || "Erreur serveur.")
  });
}
