(function() {
  function getBaseUrl(config) {
    if (config && typeof config.baseUrl === "string" && config.baseUrl.trim()) {
      return config.baseUrl.trim();
    }
    const meta = document.querySelector('meta[name="szfashion-pull-url"]');
    return meta && meta.content ? String(meta.content).trim() : "";
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

  function fetchJson(url) {
    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    }).then(function(response) {
      if (!response.ok) {
        throw new Error("Lecture distante impossible (" + response.status + ").");
      }
      return response.json().then(function(payload) {
        if (payload && payload.error) {
          throw new Error(String(payload.message || "Lecture distante impossible."));
        }
        return payload;
      });
    });
  }

  function postJson(url, body) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(body || {})
    }).then(function(response) {
      if (!response.ok) {
        throw new Error("Ecriture distante impossible (" + response.status + ").");
      }
      return response.json().then(function(payload) {
        if (payload && payload.error) {
          throw new Error(String(payload.message || "Ecriture distante impossible."));
        }
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
    return {
      ok: !!(payload && payload.ok),
      mutationId: payload && payload.mutationId ? String(payload.mutationId) : "",
      item: payload && payload.item ? payload.item : null,
      historyEntry: payload && payload.historyEntry ? payload.historyEntry : null,
      ticket: payload && payload.ticket ? payload.ticket : null,
      historyEntries: Array.isArray(payload && payload.historyEntries) ? payload.historyEntries : [],
      generatedAt: payload && typeof payload.generatedAt === "string" ? payload.generatedAt : "",
      source: payload && payload.source ? payload.source : "google_sheets"
    };
  }

  function normalizeTicketsPayload(payload) {
    return {
      tickets: Array.isArray(payload && payload.tickets) ? payload.tickets : [],
      generatedAt: payload && typeof payload.generatedAt === "string" ? payload.generatedAt : "",
      source: payload && payload.source ? payload.source : "google_sheets"
    };
  }

  function normalizeTicketDetailPayload(payload) {
    return {
      ticket: payload && payload.ticket ? payload.ticket : null,
      generatedAt: payload && typeof payload.generatedAt === "string" ? payload.generatedAt : "",
      source: payload && payload.source ? payload.source : "google_sheets"
    };
  }

  window.createRemoteDataSource = function createRemoteDataSource(config) {
    const baseUrl = getBaseUrl(config);

    function ensureConfigured() {
      if (!baseUrl) {
        throw new Error("Source Google Sheets non configurée.");
      }
    }

    return {
      isConfigured: function() {
        return !!baseUrl;
      },
      fetchInventory: function() {
        ensureConfigured();
        return fetchJson(buildUrl(baseUrl, "inventory")).then(normalizeInventoryPayload);
      },
      fetchHistory: function() {
        ensureConfigured();
        return fetchJson(buildUrl(baseUrl, "history")).then(normalizeHistoryPayload);
      },
      fetchTickets: function() {
        ensureConfigured();
        return fetchJson(buildUrl(baseUrl, "tickets")).then(normalizeTicketsPayload);
      },
      fetchTicketDetail: function(ticketId) {
        ensureConfigured();
        return fetchJson(buildUrl(baseUrl, "ticket_detail", { ticketId: ticketId })).then(normalizeTicketDetailPayload);
      },
      fetchDetail: function(reference) {
        ensureConfigured();
        return fetchJson(buildUrl(baseUrl, "detail", { reference: reference })).then(function(payload) {
          return normalizeDetailPayload(payload, reference);
        });
      },
      pushMutation: function(mutation) {
        ensureConfigured();
        const route = mutation && mutation.type === "ticket_validate" ? "ticket_validate" : "mutate";
        return postJson(buildUrl(baseUrl, route), { mutation: mutation }).then(normalizeMutationPayload);
      }
    };
  };
}());
