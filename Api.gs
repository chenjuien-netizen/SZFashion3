function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const route = String(params.route || "").trim().toLowerCase();

  try {
    if (route === "inventory") {
      return apiJson_(getInventoryPayload_());
    }
    if (route === "history") {
      return apiJson_(getHistoryPayload_({ loadAll: true }));
    }
    if (route === "detail") {
      return apiJson_(getDetailPayload_(params.reference || ""));
    }
    return apiError_("Route introuvable. Utilise route=inventory, route=history ou route=detail.", 404);
  } catch (error) {
    return apiError_(error && error.message ? error.message : "Erreur serveur inconnue.", 500);
  }
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
