function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const route = String(params.route || "").trim().toLowerCase();

  try {
    requireAuthorizedRequest_(route, "GET");
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
    return apiError_("Route introuvable. Utilise route=inventory, route=history, route=detail, route=reference_import_batches, route=reference_import_batch, route=pickup_tickets, route=pickup_tickets_bootstrap ou route=pickup_ticket.", 404, "ROUTE_NOT_FOUND");
  } catch (error) {
    return apiError_(
      error && error.message ? error.message : "Erreur serveur inconnue.",
      error && error.status ? error.status : 500,
      error && error.code ? error.code : "SERVER_ERROR"
    );
  }
}

function doPost(e) {
  const params = e && e.parameter ? e.parameter : {};
  const route = String(params.route || "").trim().toLowerCase();

  try {
    requireAuthorizedRequest_(route, "POST");
    const payload = parseJsonBody_(e);
    if (route === "mutate") {
      return apiJson_(applyMutationPayload_(payload));
    }
    return apiError_("Route introuvable. Utilise route=mutate.", 404, "ROUTE_NOT_FOUND");
  } catch (error) {
    return apiError_(
      error && error.message ? error.message : "Erreur serveur inconnue.",
      error && error.status ? error.status : 500,
      error && error.code ? error.code : "SERVER_ERROR"
    );
  }
}

function apiJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function apiError_(message, status, code) {
  return apiJson_({
    error: true,
    status: Number(status || 500),
    code: String(code || "SERVER_ERROR"),
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

function requireAuthorizedRequest_(route, method) {
  const config = getSecurityConfig_();
  if (config.mode === "open") return true;

  const email = getRequestUserEmail_();
  if (!email) {
    throw buildApiError_("Authentification Google requise pour acceder a SZFashion.", 401, "AUTH_REQUIRED");
  }
  if (config.allowedEmails.length && config.allowedEmails.indexOf(email) === -1) {
    throw buildApiError_("Acces refuse: compte Google non autorise.", 403, "AUTH_FORBIDDEN");
  }
  if (config.allowedDomain) {
    const emailDomain = String(email.split("@")[1] || "").toLowerCase();
    if (!emailDomain || emailDomain !== config.allowedDomain) {
      throw buildApiError_("Acces refuse: domaine Google non autorise.", 403, "AUTH_FORBIDDEN");
    }
  }
  return true;
}

function getSecurityConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const mode = String(properties.getProperty("SZFASHION_AUTH_MODE") || "open").trim().toLowerCase();
  const allowedEmails = String(properties.getProperty("SZFASHION_ALLOWED_EMAILS") || "")
    .split(/[,\n;]/)
    .map(function(entry) { return String(entry || "").trim().toLowerCase(); })
    .filter(Boolean);
  const allowedDomain = String(properties.getProperty("SZFASHION_ALLOWED_DOMAIN") || "").trim().toLowerCase();
  return {
    mode: mode === "google" ? "google" : "open",
    allowedEmails: allowedEmails,
    allowedDomain: allowedDomain
  };
}

function getRequestUserEmail_() {
  try {
    return String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  } catch (_error) {
    return "";
  }
}

function buildApiError_(message, status, code) {
  const error = new Error(String(message || "Erreur serveur."));
  error.status = Number(status || 500);
  error.code = String(code || "SERVER_ERROR");
  return error;
}
