(function() {
  function remoteLog_(stage, payload) {
    console.info("[remote] " + stage, payload || {});
  }

  function getBaseUrlInfo(config) {
    if (config && typeof config.baseUrl === "string" && config.baseUrl.trim()) {
      return {
        apiBaseUrl: config.baseUrl.trim(),
        configured: true,
        source: "config.baseUrl",
        reason: "Configured via createRemoteDataSource(config.baseUrl)."
      };
    }
    const meta = document.querySelector('meta[name="szfashion-pull-url"]');
    if (meta && meta.content && String(meta.content).trim()) {
      return {
        apiBaseUrl: String(meta.content).trim(),
        configured: true,
        source: "meta",
        reason: "Configured via meta[name=\"szfashion-pull-url\"]."
      };
    }
    return {
      apiBaseUrl: "",
      configured: false,
      source: "missing",
      reason: 'Source Google Sheets non configurée: meta szfashion-pull-url absente.'
    };
  }

  function buildUrl(baseUrl, route, params) {
    const url = new URL(baseUrl);
    url.searchParams.set("route", route);
    Object.keys(params || {}).forEach(function(key) {
      const value = params[key];
      if (value === null || typeof value === "undefined" || value === "") return;
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  }

  function fetchJson(url, context) {
    remoteLog_("fetch start", {
      method: "GET",
      route: context && context.route ? context.route : "",
      url: url
    });
    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include"
    }).then(function(response) {
      if (!response.ok) {
        remoteLog_("fetch failed", {
          method: "GET",
          route: context && context.route ? context.route : "",
          url: url,
          status: response.status
        });
        throw new Error("Lecture distante impossible (" + response.status + ").");
      }
      return response.json().then(function(payload) {
        if (payload && payload.error) {
          const error = new Error(String(payload.message || "Lecture distante impossible."));
          error.status = Number(payload.status || response.status || 500);
          error.code = String(payload.code || "");
          remoteLog_("fetch payload error", {
            method: "GET",
            route: context && context.route ? context.route : "",
            url: url,
            status: error.status,
            code: error.code,
            message: error.message
          });
          throw error;
        }
        remoteLog_("fetch success", {
          method: "GET",
          route: context && context.route ? context.route : "",
          url: url,
          status: response.status
        });
        return payload;
      });
    });
  }

  function postJson(url, body, context) {
    remoteLog_("fetch start", {
      method: "POST",
      route: context && context.route ? context.route : "",
      url: url
    });
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(body || {}),
      credentials: "include"
    }).then(function(response) {
      if (!response.ok) {
        remoteLog_("fetch failed", {
          method: "POST",
          route: context && context.route ? context.route : "",
          url: url,
          status: response.status
        });
        throw new Error("Ecriture distante impossible (" + response.status + ").");
      }
      return response.json().then(function(payload) {
        if (payload && payload.error) {
          const error = new Error(String(payload.message || "Ecriture distante impossible."));
          error.status = Number(payload.status || response.status || 500);
          error.code = String(payload.code || "");
          remoteLog_("fetch payload error", {
            method: "POST",
            route: context && context.route ? context.route : "",
            url: url,
            status: error.status,
            code: error.code,
            message: error.message
          });
          throw error;
        }
        remoteLog_("fetch success", {
          method: "POST",
          route: context && context.route ? context.route : "",
          url: url,
          status: response.status
        });
        return payload;
      });
    });
  }

  function normalizeInventoryPayload(payload) {
    return {
      items: Array.isArray(payload && payload.items) ? payload.items : [],
      summary: payload && payload.summary ? payload.summary : null,
      generatedAt: payload && typeof payload.generatedAt === "string" ? payload.generatedAt : "",
      source: payload && payload.source ? payload.source : "google_sheets"
    };
  }

  function normalizeHistoryPayload(payload) {
    return {
      items: Array.isArray(payload && payload.items) ? payload.items : [],
      generatedAt: payload && typeof payload.generatedAt === "string" ? payload.generatedAt : "",
      source: payload && payload.source ? payload.source : "google_sheets"
    };
  }

  function normalizeDetailPayload(payload, reference) {
    return {
      item: payload && payload.item ? payload.item : null,
      history: Array.isArray(payload && payload.history) ? payload.history : [],
      notFoundInStock: !!(payload && payload.notFoundInStock),
      generatedAt: payload && typeof payload.generatedAt === "string" ? payload.generatedAt : "",
      lastMovementAt: payload && typeof payload.lastMovementAt === "string" ? payload.lastMovementAt : "",
      source: payload && payload.source ? payload.source : "google_sheets",
      reference: String(reference || "")
    };
  }

  function normalizeMutationPayload(payload) {
    const normalized = {
      ok: !!(payload && payload.ok),
      mutationId: payload && payload.mutationId ? String(payload.mutationId) : "",
      item: payload && payload.item ? payload.item : null,
      historyEntry: payload && payload.historyEntry ? payload.historyEntry : null,
      generatedAt: payload && typeof payload.generatedAt === "string" ? payload.generatedAt : "",
      source: payload && payload.source ? payload.source : "google_sheets"
    };
    ["batch", "lines", "ticket", "events", "items", "clientTicketId", "lineMappings"].forEach(function(key) {
      if (payload && Object.prototype.hasOwnProperty.call(payload, key)) {
        normalized[key] = payload[key];
      }
    });
    return normalized;
  }

  function normalizePickupTicketsBootstrapPayload(payload) {
    return {
      items: Array.isArray(payload && payload.items) ? payload.items : [],
      detailsById: payload && payload.detailsById && typeof payload.detailsById === "object" ? payload.detailsById : {},
      generatedAt: payload && typeof payload.generatedAt === "string" ? payload.generatedAt : "",
      source: payload && payload.source ? payload.source : "google_sheets"
    };
  }

  window.createRemoteDataSource = function createRemoteDataSource(config) {
    const debugInfo = getBaseUrlInfo(config);
    const baseUrl = debugInfo.apiBaseUrl;

    function ensureConfigured() {
      if (!baseUrl) {
        throw new Error(debugInfo.reason || "Source Google Sheets non configurée.");
      }
    }

    function buildRequestUrl(route, params) {
      ensureConfigured();
      return buildUrl(baseUrl, route, params);
    }

    remoteLog_("data source created", debugInfo);

    return {
      isConfigured: function() {
        return !!debugInfo.configured;
      },
      getDebugInfo: function() {
        return Object.assign({}, debugInfo);
      },
      fetchInventory: function() {
        const url = buildRequestUrl("inventory");
        return fetchJson(url, { route: "inventory" }).then(normalizeInventoryPayload);
      },
      fetchHistory: function() {
        const url = buildRequestUrl("history");
        return fetchJson(url, { route: "history" }).then(normalizeHistoryPayload);
      },
      fetchDetail: function(reference) {
        const url = buildRequestUrl("detail", { reference: reference });
        return fetchJson(url, { route: "detail" }).then(function(payload) {
          return normalizeDetailPayload(payload, reference);
        });
      },
      fetchReferenceImportBatches: function() {
        const url = buildRequestUrl("reference_import_batches");
        return fetchJson(url, { route: "reference_import_batches" });
      },
      fetchReferenceImportBatch: function(batchId) {
        const url = buildRequestUrl("reference_import_batch", { batch_id: batchId });
        return fetchJson(url, { route: "reference_import_batch" });
      },
      fetchPickupTickets: function() {
        const url = buildRequestUrl("pickup_tickets");
        return fetchJson(url, { route: "pickup_tickets" });
      },
      fetchPickupTicketsBootstrap: function() {
        const url = buildRequestUrl("pickup_tickets_bootstrap");
        return fetchJson(url, { route: "pickup_tickets_bootstrap" }).then(normalizePickupTicketsBootstrapPayload);
      },
      fetchPickupTicket: function(ticketId) {
        const url = buildRequestUrl("pickup_ticket", { ticket_id: ticketId });
        return fetchJson(url, { route: "pickup_ticket" });
      },
      pushMutation: function(mutation) {
        const url = buildRequestUrl("mutate");
        return postJson(url, { mutation: mutation }, { route: "mutate" }).then(normalizeMutationPayload);
      }
    };
  };
}());
