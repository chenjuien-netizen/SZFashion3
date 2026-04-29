function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const route = String(params.route || "").trim().toLowerCase();

  try {
    if (route === "sync" || route === "bootstrap") {
      return apiJson_(getSyncPayload_());
    }
    if (route === "inventory") {
      return apiJson_(getInventoryPayload_());
    }
    if (route === "history") {
      return apiJson_(getHistoryPayload_({ loadAll: true }));
    }
    if (route === "detail") {
      return apiJson_(getDetailPayload_(params.reference || ""));
    }
    if (route === "reference_import_batches") {
      return apiJson_(getReferenceImportBatchesPayload_());
    }
    if (route === "reference_import_batch") {
      return apiJson_(getReferenceImportBatchPayload_(params.batch_id || ""));
    }
    if (route === "pickup_tickets") {
      return apiJson_(getPickupTicketsPayload_());
    }
    if (route === "pickup_tickets_bootstrap") {
      return apiJson_(getPickupTicketsBootstrapPayload_());
    }
    if (route === "pickup_ticket") {
      return apiJson_(getPickupTicketPayload_(params.ticket_id || ""));
    }
    return apiError_("Route introuvable. Utilise route=sync, route=inventory, route=history, route=detail, route=reference_import_batches, route=reference_import_batch, route=pickup_tickets, route=pickup_tickets_bootstrap ou route=pickup_ticket.", 404);
  } catch (error) {
    return apiError_(error && error.message ? error.message : "Erreur serveur inconnue.", 500);
  }
}

function getSyncPayload_() {
  const inventory = getInventoryPayload_();
  const history = getHistoryPayload_({ loadAll: true });
  const ticketsBootstrap = getPickupTicketsBootstrapPayload_();
  return {
    inventory: inventory,
    history: history,
    ticketsBootstrap: ticketsBootstrap,
    generatedAt: inventory.generatedAt || history.generatedAt || new Date().toISOString(),
    source: "apps_script_sync"
  };
}

function doPost(e) {
  const params = e && e.parameter ? e.parameter : {};
  const route = String(params.route || "").trim().toLowerCase();

  try {
    const payload = parseJsonBody_(e);
    if (route === "mutate") {
      return apiJson_(applyMutationPayload_(payload));
    }
    return apiError_("Route introuvable. Utilise route=mutate.", 404);
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

function parseJsonBody_(e) {
  const raw = e && e.postData && typeof e.postData.contents === "string" ? e.postData.contents : "";
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_error) {
    throw new Error("Body JSON invalide.");
  }
}
