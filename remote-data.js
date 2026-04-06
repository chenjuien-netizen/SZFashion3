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
      return response.json();
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
      fetchDetail: function(reference) {
        ensureConfigured();
        return fetchJson(buildUrl(baseUrl, "detail", { reference: reference })).then(function(payload) {
          return normalizeDetailPayload(payload, reference);
        });
      }
    };
  };
}());
