const inventoryItems = [
  {
    id: "inv-001",
    reference: "SZ-TS-001",
    stockDisplay: "12 cartons / 24 pcs",
    stockState: "positive",
    warehouse: "A1",
    createdAt: "2026-01-12T09:20:00",
    remark: "Best seller noir, rotation rapide.",
    summary: "T-shirt col rond noir",
    cartons: 12,
    pieces: 24
  },
  {
    id: "inv-002",
    reference: "SZ-TS-008",
    stockDisplay: "0 carton / 0 pc",
    stockState: "zero",
    warehouse: "A1",
    createdAt: "2026-01-18T10:15:00",
    remark: "Réassort attendu semaine prochaine.",
    summary: "T-shirt oversize beige",
    cartons: 0,
    pieces: 0
  },
  {
    id: "inv-003",
    reference: "SZ-DR-014",
    stockDisplay: "8 cartons / 16 pcs",
    stockState: "positive",
    warehouse: "B2",
    createdAt: "2026-01-22T14:30:00",
    remark: "Série robe fluide printemps.",
    summary: "Robe fluide imprimée",
    cartons: 8,
    pieces: 16
  },
  {
    id: "inv-004",
    reference: "SZ-JK-203",
    stockDisplay: "3 cartons / 6 pcs",
    stockState: "positive",
    warehouse: "B1",
    createdAt: "2026-02-02T11:00:00",
    remark: "",
    summary: "Veste courte denim",
    cartons: 3,
    pieces: 6
  },
  {
    id: "inv-005",
    reference: "SZ-PT-119",
    stockDisplay: "1 carton / 4 pcs",
    stockState: "positive",
    warehouse: "C3",
    createdAt: "2026-02-06T16:45:00",
    remark: "Tailles mixtes restant en fin de lot.",
    summary: "Pantalon droit gris",
    cartons: 1,
    pieces: 4
  },
  {
    id: "inv-006",
    reference: "SZ-SK-055",
    stockDisplay: "0 carton / 2 pcs",
    stockState: "zero",
    warehouse: "B2",
    createdAt: "2026-02-11T08:35:00",
    remark: "Reste seulement des unités ouvertes.",
    summary: "Jupe plissée marine",
    cartons: 0,
    pieces: 2
  },
  {
    id: "inv-007",
    reference: "SZ-BL-032",
    stockDisplay: "15 cartons / 30 pcs",
    stockState: "positive",
    warehouse: "A2",
    createdAt: "2026-02-14T13:10:00",
    remark: "",
    summary: "Blouse satin ivoire",
    cartons: 15,
    pieces: 30
  },
  {
    id: "inv-008",
    reference: "SZ-KN-087",
    stockDisplay: "5 cartons / 10 pcs",
    stockState: "positive",
    warehouse: "C1",
    createdAt: "2026-02-20T10:05:00",
    remark: "Collection maille légère.",
    summary: "Pull maille fine taupe",
    cartons: 5,
    pieces: 10
  },
  {
    id: "inv-009",
    reference: "SZ-CT-301",
    stockDisplay: "0 carton / 0 pc",
    stockState: "zero",
    warehouse: "C2",
    createdAt: "2026-02-27T15:25:00",
    remark: "",
    summary: "Manteau long sable",
    cartons: 0,
    pieces: 0
  },
  {
    id: "inv-010",
    reference: "SZ-SH-021",
    stockDisplay: "9 cartons / 18 pcs",
    stockState: "positive",
    warehouse: "A2",
    createdAt: "2026-03-03T09:50:00",
    remark: "Sort bien sur les tailles standard.",
    summary: "Chemise rayée bleue",
    cartons: 9,
    pieces: 18
  },
  {
    id: "inv-011",
    reference: "SZ-AC-410",
    stockDisplay: "2 cartons / 12 pcs",
    stockState: "positive",
    warehouse: "C3",
    createdAt: "2026-03-07T12:40:00",
    remark: "Accessoire plié en box mix.",
    summary: "Ceinture boucle dorée",
    cartons: 2,
    pieces: 12
  },
  {
    id: "inv-012",
    reference: "SZ-DR-028",
    stockDisplay: "0 carton / 1 pc",
    stockState: "zero",
    warehouse: "B1",
    createdAt: "2026-03-11T17:00:00",
    remark: "Dernière pièce showroom.",
    summary: "Robe courte rouge",
    cartons: 0,
    pieces: 1
  }
];

const historyItems = [
  { id: "his-001", reference: "SZ-TS-001", actionType: "modifier", beforeDisplay: "8 cartons / 16 pcs", afterDisplay: "12 cartons / 24 pcs", remark: "Réception container mars.", timestamp: "2026-03-28T09:10:00" },
  { id: "his-002", reference: "SZ-DR-014", actionType: "sortie_rapide", beforeDisplay: "9 cartons / 18 pcs", afterDisplay: "8 cartons / 16 pcs", remark: "Préparation client wholesale.", timestamp: "2026-03-27T16:30:00" },
  { id: "his-003", reference: "SZ-BL-032", actionType: "modifier", beforeDisplay: "10 cartons / 20 pcs", afterDisplay: "15 cartons / 30 pcs", remark: "Réassort atelier.", timestamp: "2026-03-27T11:45:00" },
  { id: "his-004", reference: "SZ-JK-203", actionType: "modifier", beforeDisplay: "4 cartons / 8 pcs", afterDisplay: "3 cartons / 6 pcs", remark: "Correction comptage cabine.", timestamp: "2026-03-26T18:05:00" },
  { id: "his-005", reference: "SZ-SH-021", actionType: "sortie_rapide", beforeDisplay: "11 cartons / 22 pcs", afterDisplay: "9 cartons / 18 pcs", remark: "Sortie salon export.", timestamp: "2026-03-26T10:20:00" },
  { id: "his-006", reference: "SZ-TS-008", actionType: "sortie_rapide", beforeDisplay: "1 carton / 4 pcs", afterDisplay: "0 carton / 0 pc", remark: "Fin de lot client local.", timestamp: "2026-03-25T17:15:00" },
  { id: "his-007", reference: "SZ-KN-087", actionType: "modifier", beforeDisplay: "3 cartons / 6 pcs", afterDisplay: "5 cartons / 10 pcs", remark: "Retour finition maille.", timestamp: "2026-03-25T09:40:00" },
  { id: "his-008", reference: "SZ-AC-410", actionType: "modifier", beforeDisplay: "1 carton / 6 pcs", afterDisplay: "2 cartons / 12 pcs", remark: "", timestamp: "2026-03-24T15:50:00" },
  { id: "his-009", reference: "SZ-SK-055", actionType: "modifier", beforeDisplay: "0 carton / 0 pc", afterDisplay: "0 carton / 2 pcs", remark: "Deux pièces retrouvées au picking.", timestamp: "2026-03-24T08:25:00" },
  { id: "his-010", reference: "SZ-PT-119", actionType: "sortie_rapide", beforeDisplay: "2 cartons / 8 pcs", afterDisplay: "1 carton / 4 pcs", remark: "Commande boutique partenaire.", timestamp: "2026-03-23T13:15:00" },
  { id: "his-011", reference: "SZ-CT-301", actionType: "sortie_rapide", beforeDisplay: "1 carton / 2 pcs", afterDisplay: "0 carton / 0 pc", remark: "Échantillons showroom sortis.", timestamp: "2026-03-22T16:40:00" },
  { id: "his-012", reference: "SZ-DR-028", actionType: "modifier", beforeDisplay: "0 carton / 0 pc", afterDisplay: "0 carton / 1 pc", remark: "Pièce de présentation reclassée.", timestamp: "2026-03-22T11:10:00" },
  { id: "his-013", reference: "SZ-TS-001", actionType: "sortie_rapide", beforeDisplay: "13 cartons / 26 pcs", afterDisplay: "8 cartons / 16 pcs", remark: "Sortie gros compte France.", timestamp: "2026-03-21T14:20:00" },
  { id: "his-014", reference: "SZ-DR-014", actionType: "modifier", beforeDisplay: "6 cartons / 12 pcs", afterDisplay: "9 cartons / 18 pcs", remark: "Nouveau lot réceptionné.", timestamp: "2026-03-20T10:30:00" },
  { id: "his-015", reference: "SZ-JK-203", actionType: "modifier", beforeDisplay: "2 cartons / 4 pcs", afterDisplay: "4 cartons / 8 pcs", remark: "", timestamp: "2026-03-19T09:05:00" },
  { id: "his-016", reference: "SZ-BL-032", actionType: "sortie_rapide", beforeDisplay: "12 cartons / 24 pcs", afterDisplay: "10 cartons / 20 pcs", remark: "Transfert vers corner retail.", timestamp: "2026-03-18T12:55:00" },
  { id: "his-017", reference: "SZ-SH-021", actionType: "modifier", beforeDisplay: "7 cartons / 14 pcs", afterDisplay: "11 cartons / 22 pcs", remark: "Réception chemises repassées.", timestamp: "2026-03-18T09:15:00" },
  { id: "his-018", reference: "SZ-AC-410", actionType: "modifier", beforeDisplay: "2 cartons / 10 pcs", afterDisplay: "1 carton / 6 pcs", remark: "Erreur de conditionnement corrigée.", timestamp: "2026-03-17T17:30:00" },
  { id: "his-019", reference: "SZ-KN-087", actionType: "sortie_rapide", beforeDisplay: "4 cartons / 8 pcs", afterDisplay: "3 cartons / 6 pcs", remark: "Sortie commande capsule.", timestamp: "2026-03-17T10:45:00" },
  { id: "his-020", reference: "SZ-PT-119", actionType: "modifier", beforeDisplay: "0 carton / 0 pc", afterDisplay: "2 cartons / 8 pcs", remark: "Ouverture nouvelle série.", timestamp: "2026-03-16T11:25:00" }
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

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDateLabel(isoText) {
  if (!isoText) return "--/--/----";
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return "--/--/----";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTimeCompact(isoText) {
  if (!isoText) return "-";
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date).replace(",", "");
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
    const haystack = normalizeText(item.reference + " " + item.stockDisplay + " " + item.warehouse);
    return haystack.includes(normalizedQuery);
  });
}

function filterHistoryItems(query, actionType) {
  const normalizedQuery = normalizeText(query);
  const normalizedType = String(actionType || "").trim();

  return historyItems
    .filter(function(entry) {
      const haystack = normalizeText(entry.reference + " " + entry.actionType + " " + entry.remark);
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesType = !normalizedType || entry.actionType === normalizedType;
      return matchesQuery && matchesType;
    })
    .sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
}

function summarizeInventory(items) {
  return items.reduce(function(accumulator, item) {
    accumulator.refs += 1;
    accumulator.cartons += Number(item.cartons || 0);
    accumulator.pieces += Number(item.pieces || 0);
    if (item.stockState === "positive") {
      accumulator.positive += 1;
    } else {
      accumulator.zero += 1;
    }
    return accumulator;
  }, {
    refs: 0,
    positive: 0,
    zero: 0,
    cartons: 0,
    pieces: 0
  });
}

function renderItemMarkup(item) {
  const stockClass = item.stockState === "positive" ? "" : " is-zero";
  const stateLabel = item.stockState === "positive" ? "En stock" : "En rupture";
  const itemClass = item.stockState === "positive" ? "inventory-card is-positive" : "inventory-card";

  return ""
    + '<article class="' + itemClass + '" data-reference="' + escapeHtml(item.reference) + '">'
    + '<div class="inventory-card-main">'
    + '<div class="inventory-card-head">'
    + '<span class="inventory-reference">' + escapeHtml(item.reference) + "</span>"
    + '<span class="inventory-state">' + escapeHtml(stateLabel) + "</span>"
    + "</div>"
    + '<span class="inventory-stock' + stockClass + '">' + escapeHtml(item.stockDisplay) + "</span>"
    + '<div class="inventory-meta">Entrepot ' + escapeHtml(item.warehouse) + "</div>"
    + "</div>"
    + '<a class="reference-detail-trigger" href="./detail.html?ref=' + encodeURIComponent(item.reference) + '" aria-label="Ouvrir la fiche de ' + escapeHtml(item.reference) + '">'
    + '<span class="material-symbols-outlined">chevron_right</span>'
    + "</a>"
    + "</article>";
}

function getHistoryBadgeClass(actionType) {
  return actionType === "sortie_rapide" ? "history-badge is-sortie_rapide" : "history-badge is-modifier";
}

function renderHistoryRow(entry) {
  const beforeMarkup = entry.beforeDisplay
    ? '<div class="history-copy"><strong>AVANT</strong><span> ' + escapeHtml(entry.beforeDisplay) + "</span></div>"
    : "";
  const afterMarkup = entry.afterDisplay
    ? '<div class="history-copy"><strong>APRÈS</strong><span> ' + escapeHtml(entry.afterDisplay) + "</span></div>"
    : "";
  const remarkMarkup = entry.remark
    ? '<div class="history-remark">' + escapeHtml(entry.remark) + "</div>"
    : "";

  return ""
    + '<article class="history-row">'
    + '<div class="history-row-head">'
    + '<div>'
    + '<a class="history-reference-link" href="./detail.html?ref=' + encodeURIComponent(entry.reference) + '">' + escapeHtml(entry.reference) + "</a>"
    + '<div class="history-timestamp">' + escapeHtml(formatDateTimeCompact(entry.timestamp)) + "</div>"
    + "</div>"
    + '<span class="' + getHistoryBadgeClass(entry.actionType) + '">' + escapeHtml(entry.actionType) + "</span>"
    + "</div>"
    + '<div class="history-row-body">' + beforeMarkup + afterMarkup + remarkMarkup + "</div>"
    + "</article>";
}

function renderDetailHistoryRow(entry) {
  const beforeMarkup = entry.beforeDisplay
    ? '<div class="history-copy"><strong>AVANT</strong><span> ' + escapeHtml(entry.beforeDisplay) + "</span></div>"
    : "";
  const afterMarkup = entry.afterDisplay
    ? '<div class="history-copy"><strong>APRÈS</strong><span> ' + escapeHtml(entry.afterDisplay) + "</span></div>"
    : "";
  const remarkMarkup = entry.remark
    ? '<div class="history-remark">' + escapeHtml(entry.remark) + "</div>"
    : "";

  return ""
    + '<article class="detail-history-row">'
    + '<div class="detail-history-row-head">'
    + '<div class="detail-history-timestamp">' + escapeHtml(formatDateTimeCompact(entry.timestamp)) + "</div>"
    + '<span class="' + getHistoryBadgeClass(entry.actionType) + '">' + escapeHtml(entry.actionType) + "</span>"
    + "</div>"
    + '<div class="detail-history-row-body">' + beforeMarkup + afterMarkup + remarkMarkup + "</div>"
    + "</article>";
}

function bootInventoryPage() {
  const searchInput = document.getElementById("searchInput");
  const summaryDate = document.getElementById("summaryDate");
  const summaryRefs = document.getElementById("summaryRefs");
  const summaryPositive = document.getElementById("summaryPositive");
  const summaryZero = document.getElementById("summaryZero");
  const summaryTotals = document.getElementById("summaryTotals");
  const summaryStatus = document.getElementById("summaryStatus");
  const inventoryGrid = document.getElementById("inventoryGrid");
  const emptyState = document.getElementById("emptyState");

  if (!searchInput || !summaryDate || !summaryRefs || !summaryPositive || !summaryZero || !summaryTotals || !summaryStatus || !inventoryGrid || !emptyState) {
    return;
  }

  function renderInventory() {
    const visibleItems = filterInventoryItems(searchInput.value);
    const summary = summarizeInventory(visibleItems);
    const referenceDate = inventoryItems.length > 0 ? inventoryItems[inventoryItems.length - 1].createdAt : "";

    inventoryGrid.innerHTML = visibleItems.map(renderItemMarkup).join("");
    emptyState.classList.toggle("hidden", visibleItems.length > 0);
    summaryDate.textContent = formatDateLabel(referenceDate);
    summaryRefs.textContent = summary.refs + " refs";
    summaryPositive.textContent = summary.positive + " en stock";
    summaryZero.textContent = summary.zero + " en rupture";
    summaryTotals.textContent = summary.cartons + " cartons " + summary.pieces + " pcs";
    summaryStatus.textContent = searchInput.value.trim() ? "Recherche" : "Pret";
  }

  renderInventory();
  searchInput.addEventListener("input", renderInventory);
}

function bootHistoryPage() {
  const searchInput = document.getElementById("historySearchInput");
  const typeFilter = document.getElementById("historyActionTypeFilter");
  const historySummary = document.getElementById("historySummary");
  const historyStatus = document.getElementById("historyStatus");
  const historyList = document.getElementById("historyList");
  const emptyState = document.getElementById("historyEmptyState");
  const emptyTitle = document.getElementById("historyEmptyTitle");
  const emptyMessage = document.getElementById("historyEmptyMessage");

  if (!searchInput || !typeFilter || !historySummary || !historyStatus || !historyList || !emptyState || !emptyTitle || !emptyMessage) {
    return;
  }

  function renderHistory() {
    const visibleItems = filterHistoryItems(searchInput.value, typeFilter.value);
    const hasFilters = !!(searchInput.value.trim() || typeFilter.value);

    historyList.innerHTML = visibleItems.map(renderHistoryRow).join("");
    emptyState.classList.toggle("hidden", visibleItems.length > 0);
    emptyTitle.textContent = hasFilters ? "Aucun resultat" : "Aucun historique";
    emptyMessage.textContent = hasFilters
      ? "Aucun mouvement ne correspond à la recherche."
      : "Aucun mouvement à afficher.";
    historySummary.textContent = visibleItems.length > 0 ? visibleItems.length + " mouvements" : "-";
    historyStatus.textContent = hasFilters ? "Filtres" : "Pret";
  }

  renderHistory();
  searchInput.addEventListener("input", renderHistory);
  typeFilter.addEventListener("change", renderHistory);
}

function bootDetailPage() {
  const backButton = document.getElementById("detailBackButton");
  const referenceEl = document.getElementById("detailReference");
  const sublineEl = document.getElementById("detailSubline");
  const notFoundBanner = document.getElementById("detailNotFoundBanner");
  const detailContent = document.getElementById("detailContent");
  const stockDisplayEl = document.getElementById("detailStockDisplay");
  const stockStateEl = document.getElementById("detailStockState");
  const warehouseEl = document.getElementById("detailWarehouse");
  const createdAtEl = document.getElementById("detailCreatedAt");
  const lastMovementEl = document.getElementById("detailLastMovement");
  const summaryEl = document.getElementById("detailSummary");
  const remarkSection = document.getElementById("detailRemarkSection");
  const remarkEl = document.getElementById("detailRemark");
  const detailHistoryList = document.getElementById("detailHistoryList");
  const detailHistoryEmpty = document.getElementById("detailHistoryEmpty");

  if (
    !backButton || !referenceEl || !sublineEl || !notFoundBanner || !detailContent ||
    !stockDisplayEl || !stockStateEl || !warehouseEl || !createdAtEl || !lastMovementEl ||
    !summaryEl || !remarkSection || !remarkEl || !detailHistoryList || !detailHistoryEmpty
  ) {
    return;
  }

  backButton.addEventListener("click", function() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "./index.html";
    }
  });

  const reference = getParam("ref");
  const item = getInventoryByReference(reference);

  if (!item) {
    notFoundBanner.classList.remove("hidden");
    detailContent.classList.add("hidden");
    referenceEl.textContent = reference || "-";
    sublineEl.textContent = "Fiche produit";
    return;
  }

  const relatedHistory = getHistoryForReference(reference);
  const latestHistory = relatedHistory.length > 0 ? relatedHistory[0] : null;

  referenceEl.textContent = item.reference;
  sublineEl.textContent = "Fiche produit";
  stockDisplayEl.textContent = item.stockDisplay;
  stockStateEl.textContent = item.stockState === "positive" ? "En stock" : "En rupture";
  warehouseEl.textContent = item.warehouse || "-";
  createdAtEl.textContent = formatDateLabel(item.createdAt);
  lastMovementEl.textContent = latestHistory ? formatDateTimeCompact(latestHistory.timestamp) : "-";
  summaryEl.textContent = item.summary || "-";

  if (item.remark) {
    remarkSection.classList.remove("hidden");
    remarkEl.textContent = item.remark;
  } else {
    remarkSection.classList.add("hidden");
  }

  detailHistoryList.innerHTML = relatedHistory.map(renderDetailHistoryRow).join("");
  detailHistoryEmpty.classList.toggle("hidden", relatedHistory.length > 0);
}

function initApp() {
  const page = getCurrentPage();

  if (page === "inventory") {
    bootInventoryPage();
  } else if (page === "history") {
    bootHistoryPage();
  } else if (page === "detail") {
    bootDetailPage();
  }
}

document.addEventListener("DOMContentLoaded", initApp);
