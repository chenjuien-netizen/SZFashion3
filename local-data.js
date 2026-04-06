(function() {
  const STORAGE_KEY = "szfashion-stockmobile-local-v1";

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
    function buildBootstrapSnapshot() {
      return {
        items: [],
        historyItems: [],
        pendingMutations: [],
        syncStatus: "idle",
        lastSyncAt: "",
        dataSource: "local-empty"
      };
    }

    function cloneRequestPayload(request) {
      return JSON.parse(JSON.stringify(request || {}));
    }

    function buildPendingMutation(request, item) {
      return {
        id: "mut_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        type: "quick_edit",
        createdAt: new Date().toISOString(),
        reference: String((item && item.reference) || request.reference || ""),
        itemId: String((item && item.id) || request.id || ""),
        actionType: String(request.localActionType || "adjustment"),
        request: cloneRequestPayload(request)
      };
    }

    function replaceItemInList(items, nextItem, normalizedReference) {
      const list = Array.isArray(items) ? items.slice() : [];
      let replaced = false;
      const nextList = list.map(function(entry) {
        const sameId = nextItem && entry && nextItem.id && entry.id === nextItem.id;
        const sameReference = normalizedReference && deps.normalizeReference(entry.reference) === normalizedReference;
        if (sameId || sameReference) {
          replaced = true;
          return nextItem;
        }
        return entry;
      });
      if (!replaced && nextItem) nextList.unshift(nextItem);
      return nextList;
    }

    function mergeHistoryEntry(historyItems, historyEntry) {
      const list = Array.isArray(historyItems) ? historyItems.slice() : [];
      if (!historyEntry) return list;
      const exists = list.some(function(entry) {
        return entry && historyEntry && entry.id && historyEntry.id && entry.id === historyEntry.id;
      });
      if (!exists) list.unshift(historyEntry);
      list.sort(function(a, b) {
        return new Date(b.timestampRaw || 0) - new Date(a.timestampRaw || 0);
      });
      return list;
    }

    function applyPendingMutations(snapshot, pendingMutations) {
      const baseSnapshot = {
        items: Array.isArray(snapshot && snapshot.items) ? snapshot.items.slice() : [],
        historyItems: Array.isArray(snapshot && snapshot.historyItems) ? snapshot.historyItems.slice() : [],
        pendingMutations: Array.isArray(pendingMutations) ? pendingMutations.slice() : []
      };

      baseSnapshot.pendingMutations.forEach(function(mutation) {
        if (!mutation || mutation.type !== "quick_edit" || !mutation.request) return;

        const normalizedReference = deps.normalizeReference(mutation.reference || mutation.request.reference);
        const baseItem = baseSnapshot.items.find(function(entry) {
          if (mutation.itemId && entry.id === mutation.itemId) return true;
          return normalizedReference && deps.normalizeReference(entry.reference) === normalizedReference;
        }) || null;

        if (!baseItem) return;

        const replayRequest = cloneRequestPayload(mutation.request);
        const nextItem = deps.buildOptimisticItemFromRequest(baseItem, replayRequest);
        if (!nextItem) return;

        const historyEntry = deps.buildHistoryEntryFromLocalChange(
          mutation.actionType || replayRequest.localActionType || "adjustment",
          baseItem,
          nextItem,
          nextItem.remark
        );

        if (historyEntry && mutation.id) {
          historyEntry.id = "pending-history-" + mutation.id;
        }

        baseSnapshot.items = replaceItemInList(baseSnapshot.items, nextItem, normalizedReference);
        baseSnapshot.historyItems = mergeHistoryEntry(baseSnapshot.historyItems, historyEntry);
      });

      return {
        items: baseSnapshot.items,
        historyItems: baseSnapshot.historyItems
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
        const historyItems = Array.isArray(parsed.historyItems) ? parsed.historyItems.slice() : [];
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
      const pendingMutation = buildPendingMutation(request, nextItem);
      if (historyEntry && pendingMutation.id) {
        historyEntry.id = "pending-history-" + pendingMutation.id;
      }
      const nextSnapshot = {
        items: replaceItemInList(snapshot.items, nextItem, deps.normalizeReference(nextItem.reference)),
        historyItems: [historyEntry].concat(snapshot.historyItems),
        pendingMutations: (Array.isArray(snapshot.pendingMutations) ? snapshot.pendingMutations.slice() : []).concat(pendingMutation),
        syncStatus: "idle",
        lastSyncAt: typeof snapshot.lastSyncAt === "string" ? snapshot.lastSyncAt : "",
        dataSource: "local-pending"
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

    function mergeRemoteSnapshot(partialPayload) {
      const snapshot = readSnapshot();
      const payload = partialPayload || {};
      const nextPendingMutations = Array.isArray(snapshot.pendingMutations) ? snapshot.pendingMutations.slice() : [];
      let nextItems = Array.isArray(payload.items) ? payload.items.map(deps.hydrateItem) : snapshot.items.slice();
      let nextHistoryItems = Array.isArray(payload.historyItems) ? payload.historyItems.slice() : snapshot.historyItems.slice();
      const hasScopedReference = !!payload.reference;
      const normalizedReference = hasScopedReference ? deps.normalizeReference(payload.reference) : "";

      if (hasScopedReference && Object.prototype.hasOwnProperty.call(payload, "item")) {
        nextItems = nextItems.filter(function(entry) {
          return deps.normalizeReference(entry.reference) !== normalizedReference;
        });
        if (payload.item) {
          nextItems.unshift(deps.hydrateItem(payload.item));
        }
      }

      if (hasScopedReference && Array.isArray(payload.history)) {
        const otherHistory = nextHistoryItems.filter(function(entry) {
          return deps.normalizeReference(entry.reference) !== normalizedReference;
        });
        nextHistoryItems = payload.history.slice().concat(otherHistory);
      }

      const replayedSnapshot = applyPendingMutations({
        items: nextItems,
        historyItems: nextHistoryItems
      }, nextPendingMutations);

      const nextSnapshot = {
        items: replayedSnapshot.items,
        historyItems: replayedSnapshot.historyItems,
        pendingMutations: Array.isArray(payload.pendingMutations) ? payload.pendingMutations.slice() : nextPendingMutations,
        syncStatus: payload.syncStatus || snapshot.syncStatus || "idle",
        lastSyncAt: typeof payload.lastSyncAt === "string" ? payload.lastSyncAt : (typeof snapshot.lastSyncAt === "string" ? snapshot.lastSyncAt : ""),
        dataSource: payload.dataSource || (nextPendingMutations.length ? "remote-with-pending" : snapshot.dataSource || "local")
      };

      writeSnapshot(nextSnapshot);
      return {
        items: nextSnapshot.items.slice(),
        historyItems: nextSnapshot.historyItems.slice(),
        meta: getMeta(nextSnapshot)
      };
    }

    function commitSyncedMutation(payload) {
      const snapshot = readSnapshot();
      const nextPayload = payload || {};
      const mutationId = String(nextPayload.mutationId || "");
      const nextPendingMutations = (Array.isArray(snapshot.pendingMutations) ? snapshot.pendingMutations : []).filter(function(entry) {
        return String(entry && entry.id || "") !== mutationId;
      });
      let nextItems = Array.isArray(snapshot.items) ? snapshot.items.slice() : [];
      let nextHistoryItems = Array.isArray(snapshot.historyItems) ? snapshot.historyItems.slice() : [];

      if (nextPayload.item) {
        const normalizedReference = deps.normalizeReference(nextPayload.item.reference);
        nextItems = replaceItemInList(nextItems, deps.hydrateItem(nextPayload.item), normalizedReference);
      }

      if (nextPayload.historyEntry) {
        nextHistoryItems = mergeHistoryEntry(nextHistoryItems, nextPayload.historyEntry);
      }

      const nextSnapshot = {
        items: nextItems,
        historyItems: nextHistoryItems,
        pendingMutations: nextPendingMutations,
        syncStatus: nextPayload.syncStatus || "idle",
        lastSyncAt: typeof nextPayload.lastSyncAt === "string" ? nextPayload.lastSyncAt : snapshot.lastSyncAt || "",
        dataSource: nextPayload.dataSource || (nextPendingMutations.length ? "remote-with-pending" : "remote-cache")
      };

      writeSnapshot(nextSnapshot);
      return {
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
      mergeRemoteSnapshot: mergeRemoteSnapshot,
      commitSyncedMutation: commitSyncedMutation,
      getMeta: function() {
        return getMeta(readSnapshot());
      }
    };
  };
}());
