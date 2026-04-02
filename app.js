const inventoryItems = [
  {
    id: "inv-001",
    reference: "SZ-TS-001",
    stockDisplay: "12 cartons / 24 pcs",
    stockState: "positive",
    warehouse: "A1",
    createdAt: "2026-01-12T09:20:00",
    remark: "Best seller noir, rotation rapide.",
    summary: "T-shirt col rond noir"
  },
  {
    id: "inv-002",
    reference: "SZ-TS-008",
    stockDisplay: "0 carton / 0 pc",
    stockState: "zero",
    warehouse: "A1",
    createdAt: "2026-01-18T10:15:00",
    remark: "Réassort attendu semaine prochaine.",
    summary: "T-shirt oversize beige"
  },
  {
    id: "inv-003",
    reference: "SZ-DR-014",
    stockDisplay: "8 cartons / 16 pcs",
    stockState: "positive",
    warehouse: "B2",
    createdAt: "2026-01-22T14:30:00",
    remark: "Série robe fluide printemps.",
    summary: "Robe fluide imprimée"
  },
  {
    id: "inv-004",
    reference: "SZ-JK-203",
    stockDisplay: "3 cartons / 6 pcs",
    stockState: "positive",
    warehouse: "B1",
    createdAt: "2026-02-02T11:00:00",
    remark: "",
    summary: "Veste courte denim"
  },
  {
    id: "inv-005",
    reference: "SZ-PT-119",
    stockDisplay: "1 carton / 4 pcs",
    stockState: "positive",
    warehouse: "C3",
    createdAt: "2026-02-06T16:45:00",
    remark: "Tailles mixtes restant en fin de lot.",
    summary: "Pantalon droit gris"
  },
  {
    id: "inv-006",
    reference: "SZ-SK-055",
    stockDisplay: "0 carton / 2 pcs",
    stockState: "zero",
    warehouse: "B2",
    createdAt: "2026-02-11T08:35:00",
    remark: "Reste seulement des unités ouvertes.",
    summary: "Jupe plissée marine"
  },
  {
    id: "inv-007",
    reference: "SZ-BL-032",
    stockDisplay: "15 cartons / 30 pcs",
    stockState: "positive",
    warehouse: "A2",
    createdAt: "2026-02-14T13:10:00",
    remark: "",
    summary: "Blouse satin ivoire"
  },
  {
    id: "inv-008",
    reference: "SZ-KN-087",
    stockDisplay: "5 cartons / 10 pcs",
    stockState: "positive",
    warehouse: "C1",
    createdAt: "2026-02-20T10:05:00",
    remark: "Collection maille légère.",
    summary: "Pull maille fine taupe"
  },
  {
    id: "inv-009",
    reference: "SZ-CT-301",
    stockDisplay: "0 carton / 0 pc",
    stockState: "zero",
    warehouse: "C2",
    createdAt: "2026-02-27T15:25:00",
    remark: "",
    summary: "Manteau long sable"
  },
  {
    id: "inv-010",
    reference: "SZ-SH-021",
    stockDisplay: "9 cartons / 18 pcs",
    stockState: "positive",
    warehouse: "A2",
    createdAt: "2026-03-03T09:50:00",
    remark: "Sort bien sur les tailles standard.",
    summary: "Chemise rayée bleue"
  },
  {
    id: "inv-011",
    reference: "SZ-AC-410",
    stockDisplay: "2 cartons / 12 pcs",
    stockState: "positive",
    warehouse: "C3",
    createdAt: "2026-03-07T12:40:00",
    remark: "Accessoire plié en box mix.",
    summary: "Ceinture boucle dorée"
  },
  {
    id: "inv-012",
    reference: "SZ-DR-028",
    stockDisplay: "0 carton / 1 pc",
    stockState: "zero",
    warehouse: "B1",
    createdAt: "2026-03-11T17:00:00",
    remark: "Dernière pièce showroom.",
    summary: "Robe courte rouge"
  }
];

const historyItems = [
  { id: "his-001", reference: "SZ-TS-001", actionType: "entry", beforeDisplay: "8 cartons / 16 pcs", afterDisplay: "12 cartons / 24 pcs", remark: "Réception container mars.", timestamp: "2026-03-28T09:10:00" },
  { id: "his-002", reference: "SZ-DR-014", actionType: "exit", beforeDisplay: "9 cartons / 18 pcs", afterDisplay: "8 cartons / 16 pcs", remark: "Préparation client wholesale.", timestamp: "2026-03-27T16:30:00" },
  { id: "his-003", reference: "SZ-BL-032", actionType: "entry", beforeDisplay: "10 cartons / 20 pcs", afterDisplay: "15 cartons / 30 pcs", remark: "Réassort atelier.", timestamp: "2026-03-27T11:45:00" },
  { id: "his-004", reference: "SZ-JK-203", actionType: "adjustment", beforeDisplay: "4 cartons / 8 pcs", afterDisplay: "3 cartons / 6 pcs", remark: "Correction comptage cabine.", timestamp: "2026-03-26T18:05:00" },
  { id: "his-005", reference: "SZ-SH-021", actionType: "exit", beforeDisplay: "11 cartons / 22 pcs", afterDisplay: "9 cartons / 18 pcs", remark: "Sortie salon export.", timestamp: "2026-03-26T10:20:00" },
  { id: "his-006", reference: "SZ-TS-008", actionType: "exit", beforeDisplay: "1 carton / 4 pcs", afterDisplay: "0 carton / 0 pc", remark: "Fin de lot client local.", timestamp: "2026-03-25T17:15:00" },
  { id: "his-007", reference: "SZ-KN-087", actionType: "entry", beforeDisplay: "3 cartons / 6 pcs", afterDisplay: "5 cartons / 10 pcs", remark: "Retour finition maille.", timestamp: "2026-03-25T09:40:00" },
  { id: "his-008", reference: "SZ-AC-410", actionType: "entry", beforeDisplay: "1 carton / 6 pcs", afterDisplay: "2 cartons / 12 pcs", remark: "", timestamp: "2026-03-24T15:50:00" },
  { id: "his-009", reference: "SZ-SK-055", actionType: "adjustment", beforeDisplay: "0 carton / 0 pc", afterDisplay: "0 carton / 2 pcs", remark: "Deux pièces retrouvées au picking.", timestamp: "2026-03-24T08:25:00" },
  { id: "his-010", reference: "SZ-PT-119", actionType: "exit", beforeDisplay: "2 cartons / 8 pcs", afterDisplay: "1 carton / 4 pcs", remark: "Commande boutique partenaire.", timestamp: "2026-03-23T13:15:00" },
  { id: "his-011", reference: "SZ-CT-301", actionType: "exit", beforeDisplay: "1 carton / 2 pcs", afterDisplay: "0 carton / 0 pc", remark: "Échantillons showroom sortis.", timestamp: "2026-03-22T16:40:00" },
  { id: "his-012", reference: "SZ-DR-028", actionType: "adjustment", beforeDisplay: "0 carton / 0 pc", afterDisplay: "0 carton / 1 pc", remark: "Pièce de présentation reclassée.", timestamp: "2026-03-22T11:10:00" },
  { id: "his-013", reference: "SZ-TS-001", actionType: "exit", beforeDisplay: "13 cartons / 26 pcs", afterDisplay: "8 cartons / 16 pcs", remark: "Sortie gros compte France.", timestamp: "2026-03-21T14:20:00" },
  { id: "his-014", reference: "SZ-DR-014", actionType: "entry", beforeDisplay: "6 cartons / 12 pcs", afterDisplay: "9 cartons / 18 pcs", remark: "Nouveau lot réceptionné.", timestamp: "2026-03-20T10:30:00" },
  { id: "his-015", reference: "SZ-JK-203", actionType: "entry", beforeDisplay: "2 cartons / 4 pcs", afterDisplay: "4 cartons / 8 pcs", remark: "", timestamp: "2026-03-19T09:05:00" },
  { id: "his-016", reference: "SZ-BL-032", actionType: "exit", beforeDisplay: "12 cartons / 24 pcs", afterDisplay: "10 cartons / 20 pcs", remark: "Transfert vers corner retail.", timestamp: "2026-03-18T12:55:00" },
  { id: "his-017", reference: "SZ-SH-021", actionType: "entry", beforeDisplay: "7 cartons / 14 pcs", afterDisplay: "11 cartons / 22 pcs", remark: "Réception chemises repassées.", timestamp: "2026-03-18T09:15:00" },
  { id: "his-018", reference: "SZ-AC-410", actionType: "adjustment", beforeDisplay: "2 cartons / 10 pcs", afterDisplay: "1 carton / 6 pcs", remark: "Erreur de conditionnement corrigée.", timestamp: "2026-03-17T17:30:00" },
  { id: "his-019", reference: "SZ-KN-087", actionType: "exit", beforeDisplay: "4 cartons / 8 pcs", afterDisplay: "3 cartons / 6 pcs", remark: "Sortie commande capsule.", timestamp: "2026-03-17T10:45:00" },
  { id: "his-020", reference: "SZ-PT-119", actionType: "entry", beforeDisplay: "0 carton / 0 pc", afterDisplay: "2 cartons / 8 pcs", remark: "Ouverture nouvelle série.", timestamp: "2026-03-16T11:25:00" }
];

function getCurrentPage() {
  return document.body ? document.body.dataset.page || "" : "";
}

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || "";
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date).replace(",", " ·");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getStockLabel(stockState) {
  return stockState === "positive" ? "En stock" : "Rupture";
}

function getActionLabel(actionType) {
  if (actionType === "entry") return "Entrée";
  if (actionType === "exit") return "Sortie";
  if (actionType === "adjustment") return "Ajustement";
  return "Mouvement";
}

function getActionBadgeClass(actionType) {
  if (actionType === "entry") return "badge-entry";
  if (actionType === "exit") return "badge-exit";
  if (actionType === "adjustment") return "badge-adjustment";
  return "";
}

function getInventoryByReference(reference) {
  return inventoryItems.find(function(item) {
    return item.reference === reference;
  }) || null;
}

function getHistoryForReference(reference) {
  return historyItems
    .filter(function(entry) {
      return entry.reference === reference;
    })
    .sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
}

function filterInventoryItems(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return inventoryItems.slice();
  }

  return inventoryItems.filter(function(item) {
    const haystack = normalizeText(item.reference + " " + item.warehouse);
    return haystack.includes(normalizedQuery);
  });
}

function filterHistoryItems(query, actionType) {
  const normalizedQuery = normalizeText(query);
  const normalizedType = actionType || "all";

  return historyItems
    .filter(function(entry) {
      const matchesType = normalizedType === "all" || entry.actionType === normalizedType;
      const haystack = normalizeText(entry.reference + " " + entry.remark);
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesType && matchesQuery;
    })
    .sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
}

function getInventorySummary(items) {
  const total = items.length;
  const positive = items.filter(function(item) {
    return item.stockState === "positive";
  }).length;

  return {
    total: total,
    positive: positive,
    zero: total - positive
  };
}

function renderInventoryCard(item) {
  const detailUrl = "./detail.html?ref=" + encodeURIComponent(item.reference);

  return (
    '<article class="inventory-card is-' + escapeHtml(item.stockState) + '">' +
      '<div class="inventory-card-main">' +
        '<div class="inventory-card-top">' +
          '<h2 class="inventory-reference">' + escapeHtml(item.reference) + '</h2>' +
          '<span class="badge ' + (item.stockState === "positive" ? "badge-positive" : "badge-zero") + '">' +
            escapeHtml(getStockLabel(item.stockState)) +
          "</span>" +
        "</div>" +
        '<div class="inventory-card-bottom">' +
          "<div>" +
            '<p class="inventory-stock">' + escapeHtml(item.stockDisplay) + "</p>" +
            '<p class="inventory-meta">Entrepôt ' + escapeHtml(item.warehouse) + "</p>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<a class="link-arrow" href="' + detailUrl + '" aria-label="Voir le détail de ' + escapeHtml(item.reference) + '">→</a>' +
    "</article>"
  );
}

function renderHistoryCard(entry) {
  const detailUrl = "./detail.html?ref=" + encodeURIComponent(entry.reference);

  return (
    '<article class="history-card">' +
      '<div class="history-card-top">' +
        "<div>" +
          '<a class="history-reference-link" href="' + detailUrl + '">' + escapeHtml(entry.reference) + "</a>" +
          '<span class="history-timestamp">' + escapeHtml(formatDateTime(entry.timestamp)) + "</span>" +
        "</div>" +
        '<span class="badge ' + getActionBadgeClass(entry.actionType) + '">' + escapeHtml(getActionLabel(entry.actionType)) + "</span>" +
      "</div>" +
      '<div class="history-card-body">' +
        '<p class="history-copy"><strong>Avant</strong> ' + escapeHtml(entry.beforeDisplay) + "</p>" +
        '<p class="history-copy"><strong>Après</strong> ' + escapeHtml(entry.afterDisplay) + "</p>" +
        (entry.remark ? '<p class="history-meta">' + escapeHtml(entry.remark) + "</p>" : "") +
      "</div>" +
    "</article>"
  );
}

function renderDetailHistoryCard(entry) {
  return (
    '<article class="detail-history-card">' +
      '<div class="detail-history-top">' +
        '<span class="detail-history-timestamp">' + escapeHtml(formatDateTime(entry.timestamp)) + "</span>" +
        '<span class="badge ' + getActionBadgeClass(entry.actionType) + '">' + escapeHtml(getActionLabel(entry.actionType)) + "</span>" +
      "</div>" +
      '<div class="detail-history-body">' +
        '<p class="history-copy detail-history-copy"><strong>Avant</strong> ' + escapeHtml(entry.beforeDisplay) + "</p>" +
        '<p class="history-copy detail-history-copy"><strong>Après</strong> ' + escapeHtml(entry.afterDisplay) + "</p>" +
        (entry.remark ? '<p class="history-meta">' + escapeHtml(entry.remark) + "</p>" : "") +
      "</div>" +
    "</article>"
  );
}

function bootInventoryPage() {
  const searchInput = document.getElementById("inventorySearchInput");
  const summaryRefs = document.getElementById("inventorySummaryRefs");
  const summaryPositive = document.getElementById("inventorySummaryPositive");
  const summaryZero = document.getElementById("inventorySummaryZero");
  const list = document.getElementById("inventoryList");
  const emptyState = document.getElementById("inventoryEmptyState");

  if (!searchInput || !summaryRefs || !summaryPositive || !summaryZero || !list || !emptyState) {
    return;
  }

  function render() {
    const items = filterInventoryItems(searchInput.value);
    const summary = getInventorySummary(items);

    list.innerHTML = items.map(renderInventoryCard).join("");
    emptyState.classList.toggle("hidden", items.length > 0);
    summaryRefs.textContent = String(summary.total);
    summaryPositive.textContent = String(summary.positive);
    summaryZero.textContent = String(summary.zero);
  }

  searchInput.addEventListener("input", render);
  render();
}

function bootHistoryPage() {
  const searchInput = document.getElementById("historySearchInput");
  const typeFilter = document.getElementById("historyTypeFilter");
  const summaryCount = document.getElementById("historySummaryCount");
  const list = document.getElementById("historyList");
  const emptyState = document.getElementById("historyEmptyState");

  if (!searchInput || !typeFilter || !summaryCount || !list || !emptyState) {
    return;
  }

  function render() {
    const items = filterHistoryItems(searchInput.value, typeFilter.value);

    list.innerHTML = items.map(renderHistoryCard).join("");
    summaryCount.textContent = String(items.length);
    emptyState.classList.toggle("hidden", items.length > 0);
  }

  searchInput.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  render();
}

function bootDetailPage() {
  const backButton = document.getElementById("detailBackButton");
  const notFoundState = document.getElementById("detailNotFoundState");
  const detailContent = document.getElementById("detailContent");
  const referenceEl = document.getElementById("detailReference");
  const stockDisplayEl = document.getElementById("detailStockDisplay");
  const stockStateEl = document.getElementById("detailStockState");
  const warehouseEl = document.getElementById("detailWarehouse");
  const createdAtEl = document.getElementById("detailCreatedAt");
  const lastMovementEl = document.getElementById("detailLastMovement");
  const summaryEl = document.getElementById("detailSummary");
  const remarkBlock = document.getElementById("detailRemarkBlock");
  const remarkEl = document.getElementById("detailRemark");
  const historyList = document.getElementById("detailHistoryList");
  const historyEmptyState = document.getElementById("detailHistoryEmptyState");

  if (
    !backButton || !notFoundState || !detailContent || !referenceEl || !stockDisplayEl ||
    !stockStateEl || !warehouseEl || !createdAtEl || !lastMovementEl || !summaryEl ||
    !remarkBlock || !remarkEl || !historyList || !historyEmptyState
  ) {
    return;
  }

  backButton.addEventListener("click", function() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "./index.html";
  });

  const reference = getParam("ref");
  const item = getInventoryByReference(reference);

  if (!item) {
    notFoundState.classList.remove("hidden");
    detailContent.classList.add("hidden");
    return;
  }

  const itemHistory = getHistoryForReference(item.reference);
  const latestMovement = itemHistory.length > 0 ? itemHistory[0].timestamp : "";

  referenceEl.textContent = item.reference;
  stockDisplayEl.textContent = item.stockDisplay;
  stockStateEl.textContent = getStockLabel(item.stockState);
  stockStateEl.className = "badge " + (item.stockState === "positive" ? "badge-positive" : "badge-zero");
  warehouseEl.textContent = item.warehouse;
  createdAtEl.textContent = formatDate(item.createdAt);
  lastMovementEl.textContent = latestMovement ? formatDateTime(latestMovement) : "-";
  summaryEl.textContent = item.summary || "-";

  if (item.remark) {
    remarkEl.textContent = item.remark;
    remarkBlock.classList.remove("hidden");
  } else {
    remarkBlock.classList.add("hidden");
  }

  historyList.innerHTML = itemHistory.map(renderDetailHistoryCard).join("");
  historyEmptyState.classList.toggle("hidden", itemHistory.length > 0);
}

function initApp() {
  const currentPage = getCurrentPage();

  if (currentPage === "inventory") {
    bootInventoryPage();
  } else if (currentPage === "history") {
    bootHistoryPage();
  } else if (currentPage === "detail") {
    bootDetailPage();
  }
}

document.addEventListener("DOMContentLoaded", initApp);
