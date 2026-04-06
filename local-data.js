(function() {
  const STORAGE_KEY = "szfashion-stockmobile-local-v1";

  const seedItems = [
    { id: "row_2", reference: "SZ-DR-014", sortKey: "SZ-DR-014", tail: 85, unitsPerBox: 144, itemBoxes: 3, sign: "+", fractionText: "1/2", fractionValue: 0.5, colisage: 12, packNotation: "+2包", remark: "B2 haut droite", warehouse: "B2", createdAt: "15/02/2026" },
    { id: "row_3", reference: "SZ-TS-001", sortKey: "SZ-TS-001", tail: 0, unitsPerBox: 120, itemBoxes: 4, sign: "+", fractionText: "1/3", fractionValue: 1 / 3, colisage: 10, packNotation: "", remark: "A1 table 3", warehouse: "A1", createdAt: "12/02/2026" },
    { id: "row_4", reference: "SZ-JK-203", sortKey: "SZ-JK-203", tail: 0, unitsPerBox: 96, itemBoxes: 2, sign: "", fractionText: "", fractionValue: 0, colisage: 12, packNotation: "", remark: "B1 rack veste", warehouse: "B1", createdAt: "18/02/2026" },
    { id: "row_5", reference: "SZ-BL-032", sortKey: "SZ-BL-032", tail: 0, unitsPerBox: 72, itemBoxes: 5, sign: "+", fractionText: "2/3", fractionValue: 2 / 3, colisage: 6, packNotation: "", remark: "", warehouse: "A2", createdAt: "20/02/2026" },
    { id: "row_6", reference: "SZ-KN-087", sortKey: "SZ-KN-087", tail: 24, unitsPerBox: 48, itemBoxes: 2, sign: "+", fractionText: "1/4", fractionValue: 0.25, colisage: 12, packNotation: "+1包", remark: "C1 maille", warehouse: "C1", createdAt: "24/02/2026" },
    { id: "row_7", reference: "SZ-PT-119", sortKey: "SZ-PT-119", tail: 0, unitsPerBox: 60, itemBoxes: 1, sign: "+", fractionText: "1/2", fractionValue: 0.5, colisage: 12, packNotation: "", remark: "C3 bas", warehouse: "C3", createdAt: "01/03/2026" },
    { id: "row_8", reference: "SZ-SH-021", sortKey: "SZ-SH-021", tail: 0, unitsPerBox: 84, itemBoxes: 3, sign: "", fractionText: "", fractionValue: 0, colisage: 12, packNotation: "", remark: "A2 entrée", warehouse: "A2", createdAt: "04/03/2026" },
    { id: "row_9", reference: "SZ-AC-410", sortKey: "SZ-AC-410", tail: 0, unitsPerBox: 144, itemBoxes: 1, sign: "+", fractionText: "1/6", fractionValue: 1 / 6, colisage: 24, packNotation: "", remark: "C3 accessoires", warehouse: "C3", createdAt: "08/03/2026" },
    { id: "row_10", reference: "SZ-DR-028", sortKey: "SZ-DR-028", tail: 1, unitsPerBox: 96, itemBoxes: 0, sign: "", fractionText: "", fractionValue: 0, colisage: 12, packNotation: "", remark: "Showroom", warehouse: "B1", createdAt: "11/03/2026" },
    { id: "row_11", reference: "SZ-SK-055", sortKey: "SZ-SK-055", tail: 2, unitsPerBox: 72, itemBoxes: 0, sign: "", fractionText: "", fractionValue: 0, colisage: 6, packNotation: "", remark: "Reste ouvert", warehouse: "B2", createdAt: "09/03/2026" },
    { id: "row_12", reference: "SZ-CT-301", sortKey: "SZ-CT-301", tail: 0, unitsPerBox: 120, itemBoxes: 0, sign: "", fractionText: "", fractionValue: 0, colisage: 10, packNotation: "", remark: "", warehouse: "C2", createdAt: "27/02/2026" },
    { id: "row_13", reference: "SZ-TS-008", sortKey: "SZ-TS-008", tail: 0, unitsPerBox: 120, itemBoxes: 0, sign: "", fractionText: "", fractionValue: 0, colisage: 10, packNotation: "", remark: "Rupture", warehouse: "A1", createdAt: "18/01/2026" }
  ];

  const seedHistoryRaw = [
    { timestampRaw: "2026-03-28T09:10:00.000Z", actionType: "adjustment", reference: "SZ-TS-001", rowId: "row_3", beforeDisplay: "120p×4", afterDisplay: "120p×4+1/3", remark: "Ajustement comptage", source: "stock_mobile_quick_edit", beforeTotalPieces: 480, afterTotalPieces: 520 },
    { timestampRaw: "2026-03-27T16:30:00.000Z", actionType: "exit", reference: "SZ-DR-014", rowId: "row_2", beforeDisplay: "(85p)+144p×3+2/3+2包", afterDisplay: "(85p)+144p×3+1/2+2包", remark: "Sortie showroom", source: "stock_mobile_quick_edit", beforeTotalPieces: 649, afterTotalPieces: 643 },
    { timestampRaw: "2026-03-27T11:45:00.000Z", actionType: "adjustment", reference: "SZ-BL-032", rowId: "row_5", beforeDisplay: "72p×5+1/2", afterDisplay: "72p×5+2/3", remark: "Correction fraction", source: "stock_mobile_quick_edit", beforeTotalPieces: 396, afterTotalPieces: 408 },
    { timestampRaw: "2026-03-26T18:05:00.000Z", actionType: "exit", reference: "SZ-JK-203", rowId: "row_4", beforeDisplay: "96p×3", afterDisplay: "96p×2", remark: "Client export", source: "stock_mobile_quick_edit", beforeTotalPieces: 288, afterTotalPieces: 192 },
    { timestampRaw: "2026-03-26T10:20:00.000Z", actionType: "entry", reference: "SZ-SH-021", rowId: "row_8", beforeDisplay: "84p×2", afterDisplay: "84p×3", remark: "Réception repassage", source: "stock_mobile_quick_edit", beforeTotalPieces: 168, afterTotalPieces: 252 },
    { timestampRaw: "2026-03-25T17:15:00.000Z", actionType: "exit", reference: "SZ-TS-008", rowId: "row_13", beforeDisplay: "120p×1", afterDisplay: "-", remark: "Fin de lot", source: "stock_mobile_quick_edit", beforeTotalPieces: 120, afterTotalPieces: 0 },
    { timestampRaw: "2026-03-25T09:40:00.000Z", actionType: "entry", reference: "SZ-KN-087", rowId: "row_6", beforeDisplay: "(24p)+48p×2+1/4", afterDisplay: "(24p)+48p×2+1/4+1包", remark: "Ajout paquets", source: "stock_mobile_quick_edit", beforeTotalPieces: 132, afterTotalPieces: 144 },
    { timestampRaw: "2026-03-24T15:50:00.000Z", actionType: "adjustment", reference: "SZ-AC-410", rowId: "row_9", beforeDisplay: "144p×1", afterDisplay: "144p×1+1/6", remark: "", source: "stock_mobile_quick_edit", beforeTotalPieces: 144, afterTotalPieces: 168 }
  ];

  function cloneMeta(meta) {
    const nextMeta = meta || {};
    return {
      pendingMutations: Array.isArray(nextMeta.pendingMutations) ? nextMeta.pendingMutations.slice() : [],
      syncStatus: nextMeta.syncStatus || "idle",
      lastSyncAt: typeof nextMeta.lastSyncAt === "string" ? nextMeta.lastSyncAt : "",
      dataSource: nextMeta.dataSource || "local"
    };
  }

  window.createLocalDataSource = function createLocalDataSource(deps) {
    function buildSeedHistory() {
      return seedHistoryRaw.map(function(entry, index) {
        return Object.assign({ id: "seed-his-" + String(index + 1), timestampLabel: deps.formatHistoryTimestamp(entry.timestampRaw) }, entry);
      });
    }

    function buildBootstrapSnapshot() {
      return {
        items: seedItems.map(deps.hydrateItem),
        historyItems: buildSeedHistory(),
        pendingMutations: [],
        syncStatus: "idle",
        lastSyncAt: "",
        dataSource: "local"
      };
    }

    function writeSnapshot(snapshot) {
      const payload = {
        items: Array.isArray(snapshot.items) ? snapshot.items : [],
        historyItems: Array.isArray(snapshot.historyItems) ? snapshot.historyItems : [],
        pendingMutations: Array.isArray(snapshot.pendingMutations) ? snapshot.pendingMutations : [],
        syncStatus: snapshot.syncStatus || "idle",
        lastSyncAt: typeof snapshot.lastSyncAt === "string" ? snapshot.lastSyncAt : "",
        dataSource: snapshot.dataSource || "local"
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return payload;
    }

    function readSnapshot() {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return writeSnapshot(buildBootstrapSnapshot());
      }
      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed.items) ? parsed.items.map(deps.hydrateItem) : buildBootstrapSnapshot().items;
        const historyItems = Array.isArray(parsed.historyItems) ? parsed.historyItems.slice() : buildSeedHistory();
        return {
          items: items,
          historyItems: historyItems,
          pendingMutations: Array.isArray(parsed.pendingMutations) ? parsed.pendingMutations.slice() : [],
          syncStatus: parsed.syncStatus || "idle",
          lastSyncAt: typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : "",
          dataSource: parsed.dataSource || "local"
        };
      } catch (_error) {
        return writeSnapshot(buildBootstrapSnapshot());
      }
    }

    function getMeta(snapshot) {
      return cloneMeta(snapshot);
    }

    function loadInventory() {
      const snapshot = readSnapshot();
      return {
        items: snapshot.items.slice(),
        meta: getMeta(snapshot)
      };
    }

    function loadHistory() {
      const snapshot = readSnapshot();
      return {
        items: snapshot.historyItems.slice(),
        meta: getMeta(snapshot)
      };
    }

    function loadDetail(reference) {
      const snapshot = readSnapshot();
      const normalizedReference = deps.normalizeReference(reference);
      const item = snapshot.items.find(function(entry) {
        return deps.normalizeReference(entry.reference) === normalizedReference;
      }) || null;
      const history = snapshot.historyItems
        .filter(function(entry) {
          return deps.normalizeReference(entry.reference) === normalizedReference;
        })
        .sort(function(a, b) {
          return new Date(b.timestampRaw) - new Date(a.timestampRaw);
        });
      return {
        item: item,
        history: history,
        notFoundInStock: !item,
        meta: getMeta(snapshot)
      };
    }

    function saveQuickEdit(request) {
      const snapshot = readSnapshot();
      const baseItem = snapshot.items.find(function(entry) {
        return entry.id === request.id;
      }) || null;
      if (!baseItem) {
        throw new Error("Reference introuvable. Merci de rafraichir.");
      }
      const nextItem = deps.buildOptimisticItemFromRequest(baseItem, request);
      if (!nextItem) {
        throw new Error("Impossible de calculer la mise a jour locale.");
      }
      const historyEntry = deps.buildHistoryEntryFromLocalChange(
        request.localActionType || "adjustment",
        baseItem,
        nextItem,
        nextItem.remark
      );
      const nextSnapshot = {
        items: snapshot.items.map(function(entry) {
          return entry.id === nextItem.id ? nextItem : entry;
        }),
        historyItems: [historyEntry].concat(snapshot.historyItems),
        pendingMutations: Array.isArray(snapshot.pendingMutations) ? snapshot.pendingMutations.slice() : [],
        syncStatus: snapshot.syncStatus || "idle",
        lastSyncAt: typeof snapshot.lastSyncAt === "string" ? snapshot.lastSyncAt : "",
        dataSource: snapshot.dataSource || "local"
      };
      writeSnapshot(nextSnapshot);
      return {
        item: nextItem,
        historyEntry: historyEntry,
        items: nextSnapshot.items.slice(),
        historyItems: nextSnapshot.historyItems.slice(),
        meta: getMeta(nextSnapshot)
      };
    }

    return {
      loadInventory: loadInventory,
      loadHistory: loadHistory,
      loadDetail: loadDetail,
      saveQuickEdit: saveQuickEdit,
      getMeta: function() {
        return getMeta(readSnapshot());
      }
    };
  };
}());
