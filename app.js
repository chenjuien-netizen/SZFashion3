const inventoryItems = [
  { id: "inv-001", reference: "SZ-TS-001", stockDisplay: "12 cartons / 24 pcs", stockState: "positive", warehouse: "A1", createdAt: "2026-01-12T09:20:00", remark: "Best seller noir, rotation rapide.", summary: "T-shirt col rond noir", totalPieces: 24 },
  { id: "inv-002", reference: "SZ-TS-008", stockDisplay: "0 carton / 0 pc", stockState: "zero", warehouse: "A1", createdAt: "2026-01-18T10:15:00", remark: "Réassort attendu semaine prochaine.", summary: "T-shirt oversize beige", totalPieces: 0 },
  { id: "inv-003", reference: "SZ-DR-014", stockDisplay: "8 cartons / 16 pcs", stockState: "positive", warehouse: "B2", createdAt: "2026-01-22T14:30:00", remark: "Série robe fluide printemps.", summary: "Robe fluide imprimée", totalPieces: 16 },
  { id: "inv-004", reference: "SZ-JK-203", stockDisplay: "3 cartons / 6 pcs", stockState: "positive", warehouse: "B1", createdAt: "2026-02-02T11:00:00", remark: "", summary: "Veste courte denim", totalPieces: 6 },
  { id: "inv-005", reference: "SZ-PT-119", stockDisplay: "1 carton / 4 pcs", stockState: "positive", warehouse: "C3", createdAt: "2026-02-06T16:45:00", remark: "Tailles mixtes restant en fin de lot.", summary: "Pantalon droit gris", totalPieces: 4 },
  { id: "inv-006", reference: "SZ-SK-055", stockDisplay: "0 carton / 2 pcs", stockState: "zero", warehouse: "B2", createdAt: "2026-02-11T08:35:00", remark: "Reste seulement des unités ouvertes.", summary: "Jupe plissée marine", totalPieces: 2 },
  { id: "inv-007", reference: "SZ-BL-032", stockDisplay: "15 cartons / 30 pcs", stockState: "positive", warehouse: "A2", createdAt: "2026-02-14T13:10:00", remark: "", summary: "Blouse satin ivoire", totalPieces: 30 },
  { id: "inv-008", reference: "SZ-KN-087", stockDisplay: "5 cartons / 10 pcs", stockState: "positive", warehouse: "C1", createdAt: "2026-02-20T10:05:00", remark: "Collection maille légère.", summary: "Pull maille fine taupe", totalPieces: 10 },
  { id: "inv-009", reference: "SZ-CT-301", stockDisplay: "0 carton / 0 pc", stockState: "zero", warehouse: "C2", createdAt: "2026-02-27T15:25:00", remark: "", summary: "Manteau long sable", totalPieces: 0 },
  { id: "inv-010", reference: "SZ-SH-021", stockDisplay: "9 cartons / 18 pcs", stockState: "positive", warehouse: "A2", createdAt: "2026-03-03T09:50:00", remark: "Sort bien sur les tailles standard.", summary: "Chemise rayée bleue", totalPieces: 18 },
  { id: "inv-011", reference: "SZ-AC-410", stockDisplay: "2 cartons / 12 pcs", stockState: "positive", warehouse: "C3", createdAt: "2026-03-07T12:40:00", remark: "Accessoire plié en box mix.", summary: "Ceinture boucle dorée", totalPieces: 12 },
  { id: "inv-012", reference: "SZ-DR-028", stockDisplay: "0 carton / 1 pc", stockState: "zero", warehouse: "B1", createdAt: "2026-03-11T17:00:00", remark: "Dernière pièce showroom.", summary: "Robe courte rouge", totalPieces: 1 }
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
  return new URLSearchParams(window.location.search).get(name) || "";
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

function getActionBadgeClass(actionType) {
  if (actionType === "entry") return "bg-primary-container text-on-primary-container";
  if (actionType === "exit") return "bg-error-container/25 text-on-error-container";
  if (actionType === "adjustment") return "bg-surface-container-high text-on-surface-variant";
  return "bg-surface-container-high text-on-surface-variant";
}

function getActionLabel(actionType) {
  if (actionType === "entry") return "entrée";
  if (actionType === "exit") return "sortie";
  if (actionType === "adjustment") return "ajustement";
  return "-";
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
  if (!normalizedQuery) return inventoryItems.slice();

  return inventoryItems.filter(function(item) {
    return normalizeText(item.reference + " " + item.warehouse + " " + item.stockDisplay).includes(normalizedQuery);
  });
}

function filterHistoryItems(query, actionType) {
  const normalizedQuery = normalizeText(query);

  return historyItems
    .filter(function(entry) {
      const matchesType = !actionType || entry.actionType === actionType;
      const haystack = normalizeText(entry.reference + " " + entry.remark + " " + entry.actionType);
      return matchesType && (!normalizedQuery || haystack.includes(normalizedQuery));
    })
    .sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
}

function getInventorySummary(items) {
  const totalPieces = items.reduce(function(sum, item) {
    return sum + (Number(item.totalPieces) || 0);
  }, 0);
  const positiveCount = items.filter(function(item) {
    return item.stockState === "positive";
  }).length;

  return {
    refs: items.length,
    positive: positiveCount,
    zero: Math.max(0, items.length - positiveCount),
    totalPieces: totalPieces
  };
}

function renderInventoryCard(item) {
  const reference = item.reference || "-";
  const stockDisplay = item.stockDisplay || "-";
  const accentClass = item.stockState === "positive" ? "border-emerald-400/50" : "border-rose-400/50";

  return ''
    + '<article class="inventory-card bg-surface-container-lowest relative border-l-4 ' + accentClass + ' flex min-h-[4.1rem] items-stretch transition-colors duration-150 hover:bg-surface-container select-none" data-reference="' + escapeHtml(reference) + '">'
    + '<div class="flex min-w-0 flex-1 flex-col justify-between px-2.5 py-2 text-left">'
    + '<div class="flex items-start gap-2">'
    + '<span class="truncate pr-2 text-[12px] font-bold tracking-tight text-on-surface">' + escapeHtml(reference) + '</span>'
    + '</div>'
    + '<div class="mt-1.5 flex items-end justify-between gap-2">'
    + '<div class="min-w-0">'
    + '<span class="block truncate text-[13px] font-medium ' + (item.stockState === "positive" ? 'text-primary' : 'text-on-surface-variant') + '">' + escapeHtml(stockDisplay) + '</span>'
    + '<span class="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Entrepot ' + escapeHtml(item.warehouse || "-") + '</span>'
    + '</div>'
    + '<span class="shrink-0 rounded px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] ' + (item.stockState === "positive" ? 'bg-primary-container text-on-primary-container' : 'bg-error-container/25 text-on-error-container') + '">' + escapeHtml(item.stockState === "positive" ? "En stock" : "En rupture") + '</span>'
    + '</div>'
    + '</div>'
    + '<a class="reference-detail-trigger flex w-10 shrink-0 touch-manipulation select-none items-center justify-center border-l border-outline-variant/20 text-outline-variant transition-colors duration-150 hover:bg-surface-container-highest hover:text-on-surface-variant active:bg-surface-container-high" href="./detail.html?ref=' + encodeURIComponent(reference) + '" aria-label="Ouvrir la fiche de ' + escapeHtml(reference) + '">'
    + '<span class="material-symbols-outlined !text-[16px]">chevron_right</span>'
    + '</a>'
    + '</article>';
}

function renderHistoryCard(entry) {
  return ''
    + '<article class="bg-surface-container-lowest px-4 py-3 shadow-ledger" data-history-reference="' + escapeHtml(entry.reference) + '">'
    + '<div class="flex items-start justify-between gap-3">'
    + '<div class="min-w-0">'
    + '<a class="truncate text-left text-[12px] font-bold tracking-tight text-primary" href="./detail.html?ref=' + encodeURIComponent(entry.reference) + '">' + escapeHtml(entry.reference || "-") + '</a>'
    + '<div class="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">' + escapeHtml(formatDateTimeCompact(entry.timestamp)) + '</div>'
    + '</div>'
    + '<span class="shrink-0 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ' + getActionBadgeClass(entry.actionType) + '">' + escapeHtml(getActionLabel(entry.actionType)) + '</span>'
    + '</div>'
    + '<div class="mt-3 space-y-1">'
    + '<div class="text-[11px] text-on-surface"><span class="font-bold uppercase tracking-[0.14em] text-on-surface-variant">AVANT</span><span class="ml-2">' + escapeHtml(entry.beforeDisplay || "-") + '</span></div>'
    + '<div class="text-[11px] text-on-surface"><span class="font-bold uppercase tracking-[0.14em] text-on-surface-variant">APRÈS</span><span class="ml-2">' + escapeHtml(entry.afterDisplay || "-") + '</span></div>'
    + (entry.remark ? '<div class="text-[11px] text-on-surface-variant">' + escapeHtml(entry.remark) + '</div>' : '')
    + '</div>'
    + '</article>';
}

function renderDetailHistoryCard(entry) {
  return ''
    + '<article class="bg-surface-container-lowest px-4 py-3 shadow-ledger">'
    + '<div class="flex items-start justify-between gap-3">'
    + '<div class="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">' + escapeHtml(formatDateTimeCompact(entry.timestamp)) + '</div>'
    + '<span class="shrink-0 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ' + getActionBadgeClass(entry.actionType) + '">' + escapeHtml(getActionLabel(entry.actionType)) + '</span>'
    + '</div>'
    + '<div class="mt-2 space-y-1">'
    + '<div class="text-[11px] text-on-surface"><span class="font-bold uppercase tracking-[0.14em] text-on-surface-variant">AVANT</span><span class="ml-2">' + escapeHtml(entry.beforeDisplay || "-") + '</span></div>'
    + '<div class="text-[11px] text-on-surface"><span class="font-bold uppercase tracking-[0.14em] text-on-surface-variant">APRÈS</span><span class="ml-2">' + escapeHtml(entry.afterDisplay || "-") + '</span></div>'
    + (entry.remark ? '<div class="text-[11px] text-on-surface-variant">' + escapeHtml(entry.remark) + '</div>' : '')
    + '</div>'
    + '</article>';
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

  function render() {
    const items = filterInventoryItems(searchInput.value);
    const summary = getInventorySummary(items);
    inventoryGrid.innerHTML = items.join ? items.map(renderInventoryCard).join("") : "";
    emptyState.classList.toggle("hidden", items.length > 0);
    summaryDate.textContent = formatDateLabel(new Date().toISOString());
    summaryRefs.textContent = summary.refs + " refs";
    summaryPositive.textContent = summary.positive + " en stock";
    summaryZero.textContent = summary.zero + " en rupture";
    summaryTotals.textContent = summary.totalPieces + " pcs";
    summaryStatus.textContent = searchInput.value.trim() ? "Recherche" : "Pret";
  }

  searchInput.addEventListener("input", render);
  render();
}

function bootHistoryPage() {
  const searchInput = document.getElementById("historySearchInput");
  const actionTypeFilter = document.getElementById("historyActionTypeFilter");
  const historySummary = document.getElementById("historySummary");
  const historyStatus = document.getElementById("historyStatus");
  const historyList = document.getElementById("historyList");
  const historyEmptyState = document.getElementById("historyEmptyState");
  const historyEmptyTitle = document.getElementById("historyEmptyTitle");
  const historyEmptyMessage = document.getElementById("historyEmptyMessage");

  function render() {
    const actionType = actionTypeFilter.value || "";
    const items = filterHistoryItems(searchInput.value, actionType);
    const hasFilters = !!(searchInput.value.trim() || actionType);

    historyList.innerHTML = items.map(renderHistoryCard).join("");
    historySummary.textContent = items.length > 0 ? items.length + " mouvements" : "-";
    historyStatus.textContent = hasFilters ? "Filtré" : "Pret";
    historyEmptyState.classList.toggle("hidden", items.length > 0);
    historyEmptyTitle.textContent = hasFilters ? "Aucun resultat" : "Aucun historique";
    historyEmptyMessage.textContent = hasFilters
      ? "Aucun mouvement ne correspond à la recherche."
      : "Aucun mouvement à afficher.";
  }

  searchInput.addEventListener("input", render);
  actionTypeFilter.addEventListener("change", render);
  render();
}

function bootDetailPage() {
  const detailBackButton = document.getElementById("detailBackButton");
  const detailReference = document.getElementById("detailReference");
  const detailSubline = document.getElementById("detailSubline");
  const detailNotFoundBanner = document.getElementById("detailNotFoundBanner");
  const detailMainSection = document.getElementById("detailMainSection");
  const detailStockDisplay = document.getElementById("detailStockDisplay");
  const detailStockState = document.getElementById("detailStockState");
  const detailWarehouse = document.getElementById("detailWarehouse");
  const detailCreatedAt = document.getElementById("detailCreatedAt");
  const detailLastMovement = document.getElementById("detailLastMovement");
  const detailSummary = document.getElementById("detailSummary");
  const detailRemarkSection = document.getElementById("detailRemarkSection");
  const detailRemark = document.getElementById("detailRemark");
  const detailHistoryList = document.getElementById("detailHistoryList");
  const detailHistoryEmpty = document.getElementById("detailHistoryEmpty");

  detailBackButton.addEventListener("click", function() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "./index.html";
    }
  });

  const reference = getParam("ref");
  const item = getInventoryByReference(reference);

  if (!item) {
    detailReference.textContent = reference || "-";
    detailSubline.textContent = "Fiche produit";
    detailNotFoundBanner.classList.remove("hidden");
    detailMainSection.classList.add("hidden");
    detailRemarkSection.classList.add("hidden");
    detailHistoryList.innerHTML = "";
    detailHistoryEmpty.classList.remove("hidden");
    return;
  }

  const itemHistory = getHistoryForReference(item.reference);
  const latestMovement = itemHistory.length ? itemHistory[0].timestamp : "";

  detailReference.textContent = item.reference;
  detailSubline.textContent = "Fiche produit";
  detailStockDisplay.textContent = item.stockDisplay || "-";
  detailStockState.textContent = item.stockState === "positive" ? "En stock" : "En rupture";
  detailWarehouse.textContent = item.warehouse || "-";
  detailCreatedAt.textContent = formatDateLabel(item.createdAt);
  detailLastMovement.textContent = latestMovement ? formatDateTimeCompact(latestMovement) : "-";
  detailSummary.textContent = item.summary || "-";
  detailNotFoundBanner.classList.add("hidden");
  detailMainSection.classList.remove("hidden");

  if (item.remark) {
    detailRemarkSection.classList.remove("hidden");
    detailRemark.textContent = item.remark;
  } else {
    detailRemarkSection.classList.add("hidden");
  }

  detailHistoryList.innerHTML = itemHistory.map(renderDetailHistoryCard).join("");
  detailHistoryEmpty.classList.toggle("hidden", itemHistory.length > 0);
}

function initApp() {
  const currentPage = getCurrentPage();
  if (currentPage === "inventory") bootInventoryPage();
  if (currentPage === "history") bootHistoryPage();
  if (currentPage === "detail") bootDetailPage();
}

document.addEventListener("DOMContentLoaded", initApp);
