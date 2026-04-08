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
        tickets: [],
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

    function buildPendingProductRemarkMutation(request, item) {
      return {
        id: "mut_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        type: "product_remark",
        createdAt: new Date().toISOString(),
        reference: String((item && item.reference) || request.reference || ""),
        itemId: String((item && item.id) || request.id || ""),
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
        tickets: cloneTickets(snapshot && snapshot.tickets),
        pendingMutations: Array.isArray(pendingMutations) ? pendingMutations.slice() : []
      };

      baseSnapshot.pendingMutations.forEach(function(mutation) {
        if (!mutation || !mutation.request) return;

        if (String(mutation.type || "").indexOf("ticket_") === 0) {
          if (mutation.type === "ticket_create") {
            const createdTicket = applyTicketMutationLocally(null, mutation);
            baseSnapshot.tickets = replaceTicketInList(baseSnapshot.tickets, createdTicket);
            return;
          }
          const baseTicket = baseSnapshot.tickets.find(function(entry) {
            return entry.id === String(mutation.ticketId || (mutation.request && mutation.request.ticketId) || "");
          }) || null;
          if (!baseTicket) return;
          const nextTicket = applyTicketMutationLocally(baseTicket, mutation);
          baseSnapshot.tickets = replaceTicketInList(baseSnapshot.tickets, nextTicket);
          return;
        }

        const normalizedReference = deps.normalizeReference(mutation.reference || mutation.request.reference);
        const baseItem = baseSnapshot.items.find(function(entry) {
          if (mutation.itemId && entry.id === mutation.itemId) return true;
          return normalizedReference && deps.normalizeReference(entry.reference) === normalizedReference;
        }) || null;

        if (!baseItem) return;

        if (mutation.type === "product_remark") {
          const nextRemarkItem = deps.hydrateItem(Object.assign({}, baseItem, {
            remark: String(mutation.request.remark || "").trim()
          }));
          baseSnapshot.items = replaceItemInList(baseSnapshot.items, nextRemarkItem, normalizedReference);
          return;
        }

        if (mutation.type !== "quick_edit") return;

        const replayRequest = cloneRequestPayload(mutation.request);
        const nextItem = deps.buildOptimisticItemFromRequest(baseItem, replayRequest);
        if (!nextItem) return;

        const historyEntry = deps.buildHistoryEntryFromLocalChange(
          mutation.actionType || replayRequest.localActionType || "adjustment",
          baseItem,
          nextItem,
          replayRequest.remark
        );

        if (historyEntry && mutation.id) {
          historyEntry.id = "pending-history-" + mutation.id;
        }

        baseSnapshot.items = replaceItemInList(baseSnapshot.items, nextItem, normalizedReference);
        baseSnapshot.historyItems = mergeHistoryEntry(baseSnapshot.historyItems, historyEntry);
      });

      return {
        items: baseSnapshot.items,
        historyItems: baseSnapshot.historyItems,
        tickets: baseSnapshot.tickets
      };
    }

    function writeSnapshot(snapshot) {
      const payload = {
        items: Array.isArray(snapshot.items) ? snapshot.items : [],
        historyItems: Array.isArray(snapshot.historyItems) ? snapshot.historyItems : [],
        tickets: Array.isArray(snapshot.tickets) ? snapshot.tickets : [],
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
          tickets: Array.isArray(parsed.tickets) ? parsed.tickets.slice() : [],
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

    function normalizeTicketLine(line) {
      const nextLine = line || {};
      return {
        id: String(nextLine.id || ""),
        reference: String(nextLine.reference || "").trim(),
        requestedBoxes: Math.max(0, Math.trunc(Number(nextLine.requestedBoxes) || 0)),
        requestedPacks: Math.max(0, Math.trunc(Number(nextLine.requestedPacks) || 0)),
        preparedBoxes: Math.max(0, Math.trunc(Number(nextLine.preparedBoxes) || 0)),
        preparedPacks: Math.max(0, Math.trunc(Number(nextLine.preparedPacks) || 0)),
        validatedBoxes: Math.max(0, Math.trunc(Number(nextLine.validatedBoxes) || 0)),
        validatedPacks: Math.max(0, Math.trunc(Number(nextLine.validatedPacks) || 0)),
        lineStatus: String(nextLine.lineStatus || "pending"),
        note: String(nextLine.note || "")
      };
    }

    function normalizeTicket(ticket) {
      const nextTicket = ticket || {};
      return {
        id: String(nextTicket.id || ""),
        createdAt: typeof nextTicket.createdAt === "string" ? nextTicket.createdAt : "",
        updatedAt: typeof nextTicket.updatedAt === "string" ? nextTicket.updatedAt : "",
        status: String(nextTicket.status || "pending"),
        title: String(nextTicket.title || ""),
        note: String(nextTicket.note || ""),
        validatedAt: typeof nextTicket.validatedAt === "string" ? nextTicket.validatedAt : "",
        cancelledAt: typeof nextTicket.cancelledAt === "string" ? nextTicket.cancelledAt : "",
        syncState: String(nextTicket.syncState || "synced"),
        validationMutationId: String(nextTicket.validationMutationId || ""),
        lines: Array.isArray(nextTicket.lines) ? nextTicket.lines.map(normalizeTicketLine) : []
      };
    }

    function cloneTickets(list) {
      return Array.isArray(list) ? list.map(normalizeTicket) : [];
    }

    function buildTicketId() {
      return "ticket_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    }

    function buildTicketLineId() {
      return "line_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    }

    function touchTicket(ticket, patch) {
      const nextPatch = patch || {};
      return normalizeTicket(Object.assign({}, ticket, nextPatch, {
        updatedAt: typeof nextPatch.updatedAt === "string" ? nextPatch.updatedAt : new Date().toISOString()
      }));
    }

    function buildTicketMutation(type, ticketId, request) {
      return {
        id: "mut_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        type: type,
        createdAt: new Date().toISOString(),
        ticketId: String(ticketId || ""),
        request: cloneRequestPayload(request)
      };
    }

    function updateTicketInSnapshot(snapshot, nextTicket, mutation) {
      const nextPendingMutations = Array.isArray(snapshot.pendingMutations) ? snapshot.pendingMutations.slice() : [];
      if (mutation) nextPendingMutations.push(mutation);
      const nextSnapshot = Object.assign({}, snapshot, {
        tickets: replaceTicketInList(snapshot.tickets, nextTicket),
        pendingMutations: nextPendingMutations,
        dataSource: mutation ? "local-pending" : snapshot.dataSource || "local"
      });
      writeSnapshot(nextSnapshot);
      return {
        ticket: nextTicket,
        tickets: cloneTickets(nextSnapshot.tickets),
        meta: getMeta(nextSnapshot)
      };
    }

    function applyTicketMutationLocally(ticket, mutation) {
      const request = mutation && mutation.request ? mutation.request : {};
      const type = String(mutation && mutation.type || "");
      const mutationTimestamp = typeof mutation.createdAt === "string" ? mutation.createdAt : new Date().toISOString();
      const baseTicket = normalizeTicket(ticket || {});
      if (type === "ticket_create") {
        return normalizeTicket(request.ticket || baseTicket);
      }
      if (type === "ticket_update_meta") {
        return touchTicket(baseTicket, {
          updatedAt: mutationTimestamp,
          title: Object.prototype.hasOwnProperty.call(request, "title") ? String(request.title || "") : baseTicket.title,
          note: Object.prototype.hasOwnProperty.call(request, "note") ? String(request.note || "") : baseTicket.note
        });
      }
      if (type === "ticket_change_status") {
        const nextStatus = String(request.status || baseTicket.status || "pending");
        return touchTicket(baseTicket, {
          updatedAt: mutationTimestamp,
          status: nextStatus,
          cancelledAt: nextStatus === "cancelled" ? new Date().toISOString() : baseTicket.cancelledAt
        });
      }
      if (type === "ticket_add_line") {
        const nextLine = normalizeTicketLine(request.line || {});
        return touchTicket(baseTicket, {
          updatedAt: mutationTimestamp,
          lines: baseTicket.lines.concat(nextLine)
        });
      }
      if (type === "ticket_update_line") {
        const nextLines = baseTicket.lines.map(function(entry) {
          if (entry.id !== String(request.lineId || "")) return entry;
          return normalizeTicketLine(Object.assign({}, entry, request.patch || {}));
        });
        return touchTicket(baseTicket, { updatedAt: mutationTimestamp, lines: nextLines });
      }
      if (type === "ticket_delete_line") {
        return touchTicket(baseTicket, {
          updatedAt: mutationTimestamp,
          lines: baseTicket.lines.filter(function(entry) {
            return entry.id !== String(request.lineId || "");
          })
        });
      }
      if (type === "ticket_validate") {
        return touchTicket(baseTicket, {
          updatedAt: mutationTimestamp,
          status: "validated",
          validatedAt: typeof request.validatedAt === "string" ? request.validatedAt : new Date().toISOString(),
          syncState: "pending-validation",
          validationMutationId: String(mutation.id || "")
        });
      }
      return baseTicket;
    }

    function replaceTicketInList(tickets, nextTicket) {
      const list = cloneTickets(tickets);
      const index = list.findIndex(function(entry) {
        return entry.id === nextTicket.id;
      });
      if (index >= 0) {
        list[index] = normalizeTicket(nextTicket);
      } else {
        list.unshift(normalizeTicket(nextTicket));
      }
      return list;
    }

    function loadTickets() {
      const snapshot = readSnapshot();
      return {
        tickets: cloneTickets(snapshot.tickets),
        meta: getMeta(snapshot)
      };
    }

    function loadTicket(id) {
      const snapshot = readSnapshot();
      const ticket = cloneTickets(snapshot.tickets).find(function(entry) {
        return entry.id === String(id || "");
      }) || null;
      return {
        ticket: ticket,
        meta: getMeta(snapshot)
      };
    }

    function createTicket() {
      const snapshot = readSnapshot();
      const now = new Date().toISOString();
      const nextTicket = normalizeTicket({
        id: buildTicketId(),
        createdAt: now,
        updatedAt: now,
        status: "pending",
        title: "",
        note: "",
        validatedAt: "",
        cancelledAt: "",
        syncState: "pending-sync",
        validationMutationId: "",
        lines: []
      });
      const mutation = buildTicketMutation("ticket_create", nextTicket.id, { ticket: nextTicket });
      return updateTicketInSnapshot(snapshot, nextTicket, mutation);
    }

    function updateTicketMeta(id, patch) {
      const snapshot = readSnapshot();
      const ticket = cloneTickets(snapshot.tickets).find(function(entry) {
        return entry.id === String(id || "");
      }) || null;
      if (!ticket) throw new Error("Billet introuvable.");
      const mutation = buildTicketMutation("ticket_update_meta", id, patch || {});
      const nextTicket = applyTicketMutationLocally(ticket, mutation);
      nextTicket.syncState = "pending-sync";
      return updateTicketInSnapshot(snapshot, nextTicket, mutation);
    }

    function changeTicketStatus(id, status) {
      const snapshot = readSnapshot();
      const ticket = cloneTickets(snapshot.tickets).find(function(entry) {
        return entry.id === String(id || "");
      }) || null;
      if (!ticket) throw new Error("Billet introuvable.");
      const mutation = buildTicketMutation("ticket_change_status", id, { status: String(status || "pending") });
      const nextTicket = applyTicketMutationLocally(ticket, mutation);
      nextTicket.syncState = "pending-sync";
      return updateTicketInSnapshot(snapshot, nextTicket, mutation);
    }

    function addTicketLine(ticketId, line) {
      const snapshot = readSnapshot();
      const ticket = cloneTickets(snapshot.tickets).find(function(entry) {
        return entry.id === String(ticketId || "");
      }) || null;
      if (!ticket) throw new Error("Billet introuvable.");
      const nextLine = normalizeTicketLine(Object.assign({}, line, {
        id: buildTicketLineId()
      }));
      const mutation = buildTicketMutation("ticket_add_line", ticketId, { line: nextLine });
      const nextTicket = applyTicketMutationLocally(ticket, mutation);
      nextTicket.syncState = "pending-sync";
      return updateTicketInSnapshot(snapshot, nextTicket, mutation);
    }

    function updateTicketLine(ticketId, lineId, patch) {
      const snapshot = readSnapshot();
      const ticket = cloneTickets(snapshot.tickets).find(function(entry) {
        return entry.id === String(ticketId || "");
      }) || null;
      if (!ticket) throw new Error("Billet introuvable.");
      const mutation = buildTicketMutation("ticket_update_line", ticketId, {
        lineId: String(lineId || ""),
        patch: patch || {}
      });
      const nextTicket = applyTicketMutationLocally(ticket, mutation);
      nextTicket.syncState = "pending-sync";
      return updateTicketInSnapshot(snapshot, nextTicket, mutation);
    }

    function deleteTicketLine(ticketId, lineId) {
      const snapshot = readSnapshot();
      const ticket = cloneTickets(snapshot.tickets).find(function(entry) {
        return entry.id === String(ticketId || "");
      }) || null;
      if (!ticket) throw new Error("Billet introuvable.");
      const mutation = buildTicketMutation("ticket_delete_line", ticketId, { lineId: String(lineId || "") });
      const nextTicket = applyTicketMutationLocally(ticket, mutation);
      nextTicket.syncState = "pending-sync";
      return updateTicketInSnapshot(snapshot, nextTicket, mutation);
    }

    function validateTicket(ticketId, validatedAt) {
      const snapshot = readSnapshot();
      const ticket = cloneTickets(snapshot.tickets).find(function(entry) {
        return entry.id === String(ticketId || "");
      }) || null;
      if (!ticket) throw new Error("Billet introuvable.");
      const mutation = buildTicketMutation("ticket_validate", ticketId, {
        validatedAt: typeof validatedAt === "string" ? validatedAt : new Date().toISOString()
      });
      const nextTicket = applyTicketMutationLocally(ticket, mutation);
      return updateTicketInSnapshot(snapshot, nextTicket, mutation);
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
        request.remark
      );
      const pendingMutation = buildPendingMutation(request, nextItem);
      if (historyEntry && pendingMutation.id) {
        historyEntry.id = "pending-history-" + pendingMutation.id;
      }
      const nextSnapshot = {
        items: replaceItemInList(snapshot.items, nextItem, deps.normalizeReference(nextItem.reference)),
        historyItems: [historyEntry].concat(snapshot.historyItems),
        tickets: cloneTickets(snapshot.tickets),
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

    function saveProductRemark(request) {
      const snapshot = readSnapshot();
      const baseItem = snapshot.items.find(function(entry) {
        return entry.id === request.id;
      }) || null;
      if (!baseItem) {
        throw new Error("Reference introuvable. Merci de rafraichir.");
      }
      const nextItem = deps.hydrateItem(Object.assign({}, baseItem, {
        remark: String(request.remark || "").trim()
      }));
      const pendingMutation = buildPendingProductRemarkMutation(request, nextItem);
      const nextSnapshot = {
        items: replaceItemInList(snapshot.items, nextItem, deps.normalizeReference(nextItem.reference)),
        historyItems: snapshot.historyItems.slice(),
        tickets: cloneTickets(snapshot.tickets),
        pendingMutations: (Array.isArray(snapshot.pendingMutations) ? snapshot.pendingMutations.slice() : []).concat(pendingMutation),
        syncStatus: "idle",
        lastSyncAt: typeof snapshot.lastSyncAt === "string" ? snapshot.lastSyncAt : "",
        dataSource: "local-pending"
      };
      writeSnapshot(nextSnapshot);
      return {
        item: nextItem,
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
      let nextTickets = Array.isArray(payload.tickets) ? cloneTickets(payload.tickets) : cloneTickets(snapshot.tickets);
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
        historyItems: nextHistoryItems,
        tickets: nextTickets
      }, nextPendingMutations);

      const nextSnapshot = {
        items: replayedSnapshot.items,
        historyItems: replayedSnapshot.historyItems,
        tickets: replayedSnapshot.tickets,
        pendingMutations: Array.isArray(payload.pendingMutations) ? payload.pendingMutations.slice() : nextPendingMutations,
        syncStatus: payload.syncStatus || snapshot.syncStatus || "idle",
        lastSyncAt: typeof payload.lastSyncAt === "string" ? payload.lastSyncAt : (typeof snapshot.lastSyncAt === "string" ? snapshot.lastSyncAt : ""),
        dataSource: payload.dataSource || (nextPendingMutations.length ? "remote-with-pending" : snapshot.dataSource || "local")
      };

      writeSnapshot(nextSnapshot);
      return {
        items: nextSnapshot.items.slice(),
        historyItems: nextSnapshot.historyItems.slice(),
        tickets: cloneTickets(nextSnapshot.tickets),
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
      let nextTickets = cloneTickets(snapshot.tickets);

      if (nextPayload.item) {
        const normalizedReference = deps.normalizeReference(nextPayload.item.reference);
        nextItems = replaceItemInList(nextItems, deps.hydrateItem(nextPayload.item), normalizedReference);
      }

      if (nextPayload.historyEntry) {
        nextHistoryItems = mergeHistoryEntry(nextHistoryItems, nextPayload.historyEntry);
      }

      if (nextPayload.ticket) {
        nextTickets = replaceTicketInList(nextTickets, normalizeTicket(nextPayload.ticket));
      }

      const nextSnapshot = {
        items: nextItems,
        historyItems: nextHistoryItems,
        tickets: nextTickets,
        pendingMutations: nextPendingMutations,
        syncStatus: nextPayload.syncStatus || "idle",
        lastSyncAt: typeof nextPayload.lastSyncAt === "string" ? nextPayload.lastSyncAt : snapshot.lastSyncAt || "",
        dataSource: nextPayload.dataSource || (nextPendingMutations.length ? "remote-with-pending" : "remote-cache")
      };

      writeSnapshot(nextSnapshot);
      return {
        items: nextSnapshot.items.slice(),
        historyItems: nextSnapshot.historyItems.slice(),
        tickets: cloneTickets(nextSnapshot.tickets),
        meta: getMeta(nextSnapshot)
      };
    }

    return {
      loadInventory: loadInventory,
      loadHistory: loadHistory,
      loadTickets: loadTickets,
      loadTicket: loadTicket,
      loadDetail: loadDetail,
      saveQuickEdit: saveQuickEdit,
      saveProductRemark: saveProductRemark,
      createTicket: createTicket,
      updateTicketMeta: updateTicketMeta,
      changeTicketStatus: changeTicketStatus,
      addTicketLine: addTicketLine,
      updateTicketLine: updateTicketLine,
      deleteTicketLine: deleteTicketLine,
      validateTicket: validateTicket,
      mergeRemoteSnapshot: mergeRemoteSnapshot,
      commitSyncedMutation: commitSyncedMutation,
      getMeta: function() {
        return getMeta(readSnapshot());
      }
    };
  };
}());
