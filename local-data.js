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
        pickupTickets: [],
        pickupTicketDetails: {},
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
        pendingMutations: Array.isArray(pendingMutations) ? pendingMutations.slice() : []
      };

      baseSnapshot.pendingMutations.forEach(function(mutation) {
        if (!mutation || !mutation.request) return;

        if (mutation.type === "validate_pickup_ticket") {
          applyPendingValidatePickupTicketMutation_(baseSnapshot, mutation);
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
        historyItems: baseSnapshot.historyItems
      };
    }

    function convertTicketQuantityToPiecesLocal_(referenceItem, unit, quantity) {
      const safeUnit = String(unit || "").trim();
      const safeQuantity = Number(quantity || 0);
      if (!(safeQuantity > 0)) throw new Error("Quantité ticket invalide.");
      if (safeUnit === "piece") return Math.round(safeQuantity);
      if (safeUnit === "box") {
        const unitsPerBox = Math.max(0, Number(referenceItem && referenceItem.unitsPerBox || 0));
        if (!(unitsPerBox > 0)) throw new Error("Impossible de convertir en 箱 sans 件/箱.");
        return Math.round(safeQuantity * unitsPerBox);
      }
      if (safeUnit === "pack") {
        const packSize = Math.max(0, Number(referenceItem && referenceItem.colisage || 0));
        if (!(packSize > 0)) throw new Error("Impossible de convertir en 包 sans Colisage.");
        return Math.round(safeQuantity * packSize);
      }
      throw new Error("Unité ticket non supportée.");
    }

    function buildHistoryEntryFromPickupTicketValidation_(beforeItem, afterItem, linePayload, mutation) {
      const historyEntry = deps.buildHistoryEntryFromLocalChange(
        "pickup_ticket",
        beforeItem,
        afterItem,
        linePayload && linePayload.lineNote ? linePayload.lineNote : ""
      );
      if (!historyEntry) return null;
      historyEntry.source = "stock_mobile_sync_pending";
      historyEntry.businessId = String(mutation && mutation.request && mutation.request.ticketId || mutation && mutation.ticketId || "").trim();
      historyEntry.businessLineId = String(linePayload && linePayload.lineId || "").trim();
      return historyEntry;
    }

    function applyPendingValidatePickupTicketMutation_(baseSnapshot, mutation) {
      const request = mutation && mutation.request ? mutation.request : {};
      const requestLines = Array.isArray(request.lines) ? request.lines : [];
      requestLines.forEach(function(linePayload) {
        const normalizedReference = deps.normalizeReference(linePayload && linePayload.reference);
        if (!normalizedReference) return;
        const baseItem = baseSnapshot.items.find(function(entry) {
          return deps.normalizeReference(entry && entry.reference) === normalizedReference;
        }) || null;
        if (!baseItem) return;
        try {
          const beforePieces = Number(deps.stateModelToPieces(baseItem) || 0);
          const removePieces = convertTicketQuantityToPiecesLocal_(baseItem, linePayload && linePayload.pickedUnit, linePayload && linePayload.pickedQuantity);
          if (!(removePieces > 0) || removePieces > beforePieces) return;
          const afterPieces = beforePieces - removePieces;
          const nextState = deps.buildStateFromPieces(afterPieces, {
            unitsPerBox: baseItem.unitsPerBox,
            colisage: baseItem.colisage,
            remark: baseItem.remark,
            reconstructionMode: String(linePayload && linePayload.pickedUnit || "").trim() === "pack" ? "packs" : ""
          });
          const nextItem = deps.hydrateItem(Object.assign({}, baseItem, nextState));
          const historyEntry = buildHistoryEntryFromPickupTicketValidation_(baseItem, nextItem, linePayload, mutation);
          if (historyEntry && mutation.id) historyEntry.id = "pending-history-" + mutation.id + "-" + String(linePayload && linePayload.lineId || normalizedReference);
          baseSnapshot.items = replaceItemInList(baseSnapshot.items, nextItem, normalizedReference);
          baseSnapshot.historyItems = mergeHistoryEntry(baseSnapshot.historyItems, historyEntry);
        } catch (_error) {
          return;
        }
      });
    }

    function writeSnapshot(snapshot) {
      const payload = {
        items: Array.isArray(snapshot.items) ? snapshot.items : [],
        historyItems: Array.isArray(snapshot.historyItems) ? snapshot.historyItems : [],
        pickupTickets: Array.isArray(snapshot.pickupTickets) ? snapshot.pickupTickets : [],
        pickupTicketDetails: snapshot.pickupTicketDetails && typeof snapshot.pickupTicketDetails === "object" ? snapshot.pickupTicketDetails : {},
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
          pickupTickets: Array.isArray(parsed.pickupTickets) ? parsed.pickupTickets.slice() : [],
          pickupTicketDetails: parsed.pickupTicketDetails && typeof parsed.pickupTicketDetails === "object" ? parsed.pickupTicketDetails : {},
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

    function replacePickupTicketInList(list, nextTicket, matchId) {
      const ticketId = String(matchId || (nextTicket && nextTicket.ticketId) || "").trim();
      const nextList = Array.isArray(list) ? list.slice() : [];
      let replaced = false;
      for (let index = 0; index < nextList.length; index++) {
        if (String(nextList[index] && nextList[index].ticketId || "").trim() === ticketId) {
          nextList[index] = nextTicket;
          replaced = true;
          break;
        }
      }
      if (!replaced && nextTicket) nextList.unshift(nextTicket);
      nextList.sort(function(a, b) {
        return new Date((b && b.createdAt) || 0) - new Date((a && a.createdAt) || 0);
      });
      return nextList;
    }

    function removePickupTicketFromList(list, ticketId) {
      return (Array.isArray(list) ? list : []).filter(function(entry) {
        return String(entry && entry.ticketId || "").trim() !== String(ticketId || "").trim();
      });
    }

    function clonePickupTicketDetail(detail) {
      if (!detail) return null;
      return {
        ticket: detail.ticket ? Object.assign({}, detail.ticket) : null,
        lines: Array.isArray(detail.lines) ? detail.lines.map(function(line) { return Object.assign({}, line); }) : [],
        events: Array.isArray(detail.events) ? detail.events.map(function(event) { return Object.assign({}, event); }) : []
      };
    }

    function upsertPickupTicketDetail(details, ticketId, detail) {
      const nextDetails = Object.assign({}, details || {});
      const normalizedTicketId = String(ticketId || (detail && detail.ticket && detail.ticket.ticketId) || "").trim();
      if (!normalizedTicketId) return nextDetails;
      if (detail) nextDetails[normalizedTicketId] = clonePickupTicketDetail(detail);
      return nextDetails;
    }

    function removePickupTicketDetail(details, ticketId) {
      const nextDetails = Object.assign({}, details || {});
      delete nextDetails[String(ticketId || "").trim()];
      return nextDetails;
    }

    function renamePickupTicketEventIds(events, mapping) {
      const safeMapping = mapping || {};
      return (Array.isArray(events) ? events : []).map(function(event) {
        const nextEvent = Object.assign({}, event);
        if (nextEvent.ticketId && safeMapping.clientTicketId && String(nextEvent.ticketId) === String(safeMapping.clientTicketId)) {
          nextEvent.ticketId = safeMapping.ticketId;
        }
        if (nextEvent.lineId && safeMapping.lineIdMap && safeMapping.lineIdMap[nextEvent.lineId]) {
          nextEvent.lineId = safeMapping.lineIdMap[nextEvent.lineId];
        }
        return nextEvent;
      });
    }

    function rewritePendingTicketMutations_(pendingMutations, mapping, committedMutationId) {
      const safeMapping = mapping || {};
      const lineIdMap = safeMapping.lineIdMap || {};
      return (Array.isArray(pendingMutations) ? pendingMutations : []).reduce(function(nextList, entry) {
        if (!entry) return nextList;
        if (String(entry.id || "") === String(committedMutationId || "")) return nextList;
        if (!/^create_pickup_ticket$|^resolve_pickup_ticket_line$|^validate_pickup_ticket$|^cancel_pickup_ticket$/i.test(String(entry.type || ""))) {
          nextList.push(entry);
          return nextList;
        }
        const nextEntry = Object.assign({}, entry, {
          request: cloneRequestPayload(entry.request)
        });
        if (safeMapping.clientTicketId && nextEntry.ticketId === safeMapping.clientTicketId) {
          nextEntry.ticketId = safeMapping.ticketId;
        }
        if (safeMapping.clientTicketId && nextEntry.request && nextEntry.request.ticketId === safeMapping.clientTicketId) {
          nextEntry.request.ticketId = safeMapping.ticketId;
        }
        if (nextEntry.lineId && lineIdMap[nextEntry.lineId]) {
          nextEntry.lineId = lineIdMap[nextEntry.lineId];
        }
        if (nextEntry.request && nextEntry.request.lineId && lineIdMap[nextEntry.request.lineId]) {
          nextEntry.request.lineId = lineIdMap[nextEntry.request.lineId];
        }
        if (nextEntry.request && Array.isArray(nextEntry.request.lines)) {
          nextEntry.request.lines = nextEntry.request.lines.map(function(line) {
            const nextLine = Object.assign({}, line);
            if (nextLine.lineId && lineIdMap[nextLine.lineId]) nextLine.lineId = lineIdMap[nextLine.lineId];
            if (!nextLine.lineId && nextLine.clientLineId && lineIdMap[nextLine.clientLineId]) nextLine.lineId = lineIdMap[nextLine.clientLineId];
            return nextLine;
          });
        }
        nextList.push(nextEntry);
        return nextList;
      }, []);
    }

    function reconcilePickupTicketServerIdentity_(snapshot, mutation, payload) {
      const request = mutation && mutation.request ? mutation.request : {};
      const clientTicketId = String((payload && payload.clientTicketId) || request.clientTicketId || "").trim();
      const serverTicket = payload && payload.ticket ? Object.assign({}, payload.ticket) : null;
      const serverTicketId = String(serverTicket && serverTicket.ticketId || "").trim();
      if (!clientTicketId || !serverTicketId) return null;

      const currentDetail = snapshot.pickupTicketDetails && snapshot.pickupTicketDetails[clientTicketId]
        ? clonePickupTicketDetail(snapshot.pickupTicketDetails[clientTicketId])
        : null;
      const serverLines = Array.isArray(payload && payload.lines) ? payload.lines.map(function(line) { return Object.assign({}, line); }) : [];
      const lineMappings = Array.isArray(payload && payload.lineMappings) ? payload.lineMappings : [];
      const lineIdMap = {};
      lineMappings.forEach(function(entry, index) {
        const clientLineId = String(entry && (entry.clientLineId || entry.localLineId) || "").trim();
        const serverLineId = String(entry && (entry.lineId || entry.serverLineId) || "").trim();
        if (clientLineId && serverLineId) {
          lineIdMap[clientLineId] = serverLineId;
          return;
        }
        if (!clientLineId && serverLineId) {
          const requestLine = Array.isArray(request.lines) ? request.lines[index] : null;
          if (requestLine && requestLine.clientLineId) lineIdMap[String(requestLine.clientLineId)] = serverLineId;
        }
      });

      const localLines = currentDetail && Array.isArray(currentDetail.lines) ? currentDetail.lines : [];
      const mergedLines = (localLines.length ? localLines : serverLines).map(function(line, index) {
        const localLine = Object.assign({}, line);
        const mappedLineId = lineIdMap[String(localLine.lineId || "")] || "";
        const serverLine = mappedLineId
          ? serverLines.find(function(entry) { return String(entry && entry.lineId || "") === mappedLineId; })
          : (serverLines[index] || null);
        const nextLine = Object.assign({}, serverLine || {}, localLine);
        nextLine.ticketId = serverTicketId;
        if (mappedLineId) nextLine.lineId = mappedLineId;
        return nextLine;
      });

      const counters = computePickupTicketCounters(mergedLines);
      const localTicket = currentDetail && currentDetail.ticket ? currentDetail.ticket : null;
      const mergedTicket = Object.assign({}, serverTicket || {}, localTicket || {});
      mergedTicket.ticketId = serverTicketId;
      mergedTicket.ticketNumber = String(serverTicket && serverTicket.ticketNumber || mergedTicket.ticketNumber || "").trim();
      mergedTicket.createdAt = String(serverTicket && serverTicket.createdAt || mergedTicket.createdAt || "").trim();
      mergedTicket.updatedAt = String(serverTicket && serverTicket.updatedAt || mergedTicket.updatedAt || "").trim();
      mergedTicket.version = Number(serverTicket && serverTicket.version || mergedTicket.version || 0);
      mergedTicket.lineCount = counters.lineCount;
      mergedTicket.resolvedLineCount = counters.resolvedLineCount;
      mergedTicket.blockedLineCount = counters.blockedLineCount;
      mergedTicket.status = derivePickupTicketStatus(mergedTicket, mergedLines);

      const mergedEvents = renamePickupTicketEventIds(
        currentDetail && Array.isArray(currentDetail.events) && currentDetail.events.length ? currentDetail.events : (Array.isArray(payload && payload.events) ? payload.events : []),
        { clientTicketId: clientTicketId, ticketId: serverTicketId, lineIdMap: lineIdMap }
      );

      let nextTickets = removePickupTicketFromList(snapshot.pickupTickets, clientTicketId);
      nextTickets = replacePickupTicketInList(nextTickets, mergedTicket, serverTicketId);
      let nextDetails = removePickupTicketDetail(snapshot.pickupTicketDetails, clientTicketId);
      nextDetails = upsertPickupTicketDetail(nextDetails, serverTicketId, {
        ticket: mergedTicket,
        lines: mergedLines,
        events: mergedEvents
      });
      const nextPendingMutations = rewritePendingTicketMutations_(snapshot.pendingMutations, {
        clientTicketId: clientTicketId,
        ticketId: serverTicketId,
        lineIdMap: lineIdMap
      }, mutation && mutation.id);

      return {
        snapshot: {
          items: snapshot.items.slice(),
          historyItems: snapshot.historyItems.slice(),
          pickupTickets: nextTickets,
          pickupTicketDetails: nextDetails,
          pendingMutations: nextPendingMutations,
          syncStatus: "idle",
          lastSyncAt: typeof payload.generatedAt === "string" ? payload.generatedAt : snapshot.lastSyncAt,
          dataSource: nextPendingMutations.length ? "local-pending" : "remote-cache"
        },
        mapping: {
          clientTicketId: clientTicketId,
          ticketId: serverTicketId,
          ticketNumber: mergedTicket.ticketNumber,
          lineIdMap: lineIdMap
        }
      };
    }

    function computePickupTicketCounters(lines) {
      const safeLines = Array.isArray(lines) ? lines : [];
      const resolvedLineCount = safeLines.filter(function(line) {
        const status = String(line && line.status || "").trim();
        return status === "ready" || status === "partial" || status === "not_found" || status === "validated" || status === "cancelled";
      }).length;
      const blockedLineCount = safeLines.filter(function(line) {
        return String(line && line.status || "").trim() === "to_confirm";
      }).length;
      return {
        lineCount: safeLines.length,
        resolvedLineCount: resolvedLineCount,
        blockedLineCount: blockedLineCount
      };
    }

    function derivePickupTicketStatus(ticket, lines) {
      const currentStatus = String(ticket && ticket.status || "").trim();
      if (currentStatus === "validated" || currentStatus === "cancelled") return currentStatus;
      return "in_progress";
    }

    function isOptimisticPickupTicketId_(ticketId) {
      return /^tmp_pt_/i.test(String(ticketId || "").trim());
    }

    function getTicketNumberPrefixForDate(createdAt) {
      const date = createdAt ? new Date(createdAt) : new Date();
      const safeDate = isNaN(date.getTime()) ? new Date() : date;
      const day = String(safeDate.getDate()).padStart(2, "0");
      const month = String(safeDate.getMonth() + 1).padStart(2, "0");
      const year = String(safeDate.getFullYear());
      return day + month + year + "-";
    }

    function getNextLocalPickupTicketSequenceForDay_(snapshot, createdAt) {
      const prefix = getTicketNumberPrefixForDate(createdAt);
      const pattern = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d{3})(?:\\*)?$");
      return (Array.isArray(snapshot && snapshot.pickupTickets) ? snapshot.pickupTickets : []).reduce(function(maxValue, ticket) {
        const match = String(ticket && ticket.ticketNumber || "").trim().match(pattern);
        if (!match) return maxValue;
        return Math.max(maxValue, Number(match[1] || 0));
      }, 0) + 1;
    }

    function buildTempPickupTicketNumber(snapshot, createdAt) {
      const prefix = getTicketNumberPrefixForDate(createdAt);
      const sequence = getNextLocalPickupTicketSequenceForDay_(snapshot, createdAt);
      return prefix + String(sequence).padStart(3, "0") + "*";
    }

    function buildPendingTicketMutation_(type, request, extra) {
      const nextExtra = extra || {};
      return {
        id: "mut_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        type: String(type || "").trim(),
        createdAt: new Date().toISOString(),
        ticketId: String(nextExtra.ticketId || "").trim(),
        lineId: String(nextExtra.lineId || "").trim(),
        request: cloneRequestPayload(request)
      };
    }

    function buildPickupTicketEventMessage(eventType) {
      if (eventType === "ticket_created") return "Ticket créé";
      if (eventType === "line_marked_not_found") return "Ligne marquée introuvable";
      if (eventType === "line_marked_partial") return "Ligne partielle";
      if (eventType === "ticket_validated") return "Ticket validé";
      if (eventType === "ticket_cancelled") return "Ticket annulé";
      return "Ligne confirmée";
    }

    function collectPendingTicketIds_(pendingMutations) {
      return (Array.isArray(pendingMutations) ? pendingMutations : []).reduce(function(map, mutation) {
        if (!mutation || !/^create_pickup_ticket$|^resolve_pickup_ticket_line$|^validate_pickup_ticket$|^cancel_pickup_ticket$/i.test(String(mutation.type || ""))) {
          return map;
        }
        const directTicketId = String(mutation.ticketId || "").trim();
        const requestTicketId = String(mutation.request && mutation.request.ticketId || "").trim();
        if (directTicketId) map[directTicketId] = true;
        if (requestTicketId) map[requestTicketId] = true;
        return map;
      }, {});
    }

    function preserveLocalPendingTickets_(remoteTickets, remoteDetails, snapshot, pendingMutations) {
      const pendingTicketIds = collectPendingTicketIds_(pendingMutations);
      let nextTickets = Array.isArray(remoteTickets) ? remoteTickets.slice() : [];
      let nextDetails = remoteDetails && typeof remoteDetails === "object" ? Object.assign({}, remoteDetails) : {};
      (Array.isArray(snapshot && snapshot.pickupTickets) ? snapshot.pickupTickets : []).forEach(function(ticket) {
        const ticketId = String(ticket && ticket.ticketId || "").trim();
        if (!ticketId) return;
        if (!isOptimisticPickupTicketId_(ticketId) && !pendingTicketIds[ticketId]) return;
        nextTickets = replacePickupTicketInList(nextTickets, ticket, ticketId);
        if (snapshot.pickupTicketDetails && snapshot.pickupTicketDetails[ticketId]) {
          nextDetails[ticketId] = clonePickupTicketDetail(snapshot.pickupTicketDetails[ticketId]);
        }
      });
      return {
        pickupTickets: nextTickets,
        pickupTicketDetails: nextDetails
      };
    }

    function loadPickupTickets() {
      const snapshot = readSnapshot();
      return {
        items: Array.isArray(snapshot.pickupTickets) ? snapshot.pickupTickets.slice() : [],
        meta: getMeta(snapshot)
      };
    }

    function loadPickupTicket(ticketId) {
      const snapshot = readSnapshot();
      const normalizedTicketId = String(ticketId || "").trim();
      const detail = normalizedTicketId && snapshot.pickupTicketDetails ? snapshot.pickupTicketDetails[normalizedTicketId] : null;
      const cloned = clonePickupTicketDetail(detail);
      return {
        ticket: cloned && cloned.ticket ? cloned.ticket : null,
        lines: cloned && Array.isArray(cloned.lines) ? cloned.lines : [],
        events: cloned && Array.isArray(cloned.events) ? cloned.events : [],
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
        request.remark
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
      let nextPickupTickets = Array.isArray(payload.pickupTickets) ? payload.pickupTickets.slice() : (Array.isArray(snapshot.pickupTickets) ? snapshot.pickupTickets.slice() : []);
      let nextPickupTicketDetails = snapshot.pickupTicketDetails && typeof snapshot.pickupTicketDetails === "object" ? Object.assign({}, snapshot.pickupTicketDetails) : {};
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

      if (Array.isArray(payload.pickupTickets)) {
        nextPickupTickets = payload.pickupTickets.slice();
      }

      if (payload.pickupTicketDetails && typeof payload.pickupTicketDetails === "object") {
        nextPickupTicketDetails = {};
        Object.keys(payload.pickupTicketDetails).forEach(function(ticketId) {
          const detail = payload.pickupTicketDetails[ticketId];
          if (!detail || !detail.ticket) return;
          nextPickupTicketDetails[String(ticketId)] = clonePickupTicketDetail(detail);
        });
      }

      if (payload.pickupTicket && payload.pickupTicket.ticket) {
        nextPickupTicketDetails = upsertPickupTicketDetail(nextPickupTicketDetails, payload.pickupTicket.ticket.ticketId, payload.pickupTicket);
        nextPickupTickets = replacePickupTicketInList(nextPickupTickets, payload.pickupTicket.ticket, payload.pickupTicket.ticket.ticketId);
      }

      if (Array.isArray(payload.pickupTickets) || (payload.pickupTicketDetails && typeof payload.pickupTicketDetails === "object")) {
        const preservedTickets = preserveLocalPendingTickets_(nextPickupTickets, nextPickupTicketDetails, snapshot, nextPendingMutations);
        nextPickupTickets = preservedTickets.pickupTickets;
        nextPickupTicketDetails = preservedTickets.pickupTicketDetails;
      }

      const replayedSnapshot = applyPendingMutations({
        items: nextItems,
        historyItems: nextHistoryItems
      }, nextPendingMutations);

      const nextSnapshot = {
        items: replayedSnapshot.items,
        historyItems: replayedSnapshot.historyItems,
        pickupTickets: nextPickupTickets,
        pickupTicketDetails: nextPickupTicketDetails,
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
      const mutation = nextPayload.mutation || null;
      if (mutation && mutation.type === "create_pickup_ticket") {
        const reconciled = reconcilePickupTicketServerIdentity_(snapshot, mutation, nextPayload);
        if (reconciled && reconciled.snapshot) {
          writeSnapshot(reconciled.snapshot);
          return {
            items: reconciled.snapshot.items.slice(),
            historyItems: reconciled.snapshot.historyItems.slice(),
            pickupTickets: reconciled.snapshot.pickupTickets.slice(),
            meta: getMeta(reconciled.snapshot),
            ticketIdentityMapping: reconciled.mapping
          };
        }
      }
      const nextPendingMutations = (Array.isArray(snapshot.pendingMutations) ? snapshot.pendingMutations : []).filter(function(entry) {
        return String(entry && entry.id || "") !== mutationId;
      });
      let nextItems = Array.isArray(snapshot.items) ? snapshot.items.slice() : [];
      let nextHistoryItems = Array.isArray(snapshot.historyItems) ? snapshot.historyItems.slice() : [];
      let nextPickupTickets = Array.isArray(snapshot.pickupTickets) ? snapshot.pickupTickets.slice() : [];
      let nextPickupTicketDetails = snapshot.pickupTicketDetails && typeof snapshot.pickupTicketDetails === "object" ? Object.assign({}, snapshot.pickupTicketDetails) : {};

      if (nextPayload.item) {
        const normalizedReference = deps.normalizeReference(nextPayload.item.reference);
        nextItems = replaceItemInList(nextItems, deps.hydrateItem(nextPayload.item), normalizedReference);
      }

      if (nextPayload.historyEntry) {
        nextHistoryItems = mergeHistoryEntry(nextHistoryItems, nextPayload.historyEntry);
      }

      if (Array.isArray(nextPayload.pickupTickets)) {
        nextPickupTickets = nextPayload.pickupTickets.slice();
      }

      if (nextPayload.pickupTicket && nextPayload.pickupTicket.ticket && (!mutation || !/^resolve_pickup_ticket_line$|^validate_pickup_ticket$|^cancel_pickup_ticket$/i.test(String(mutation.type || "")))) {
        nextPickupTicketDetails = upsertPickupTicketDetail(nextPickupTicketDetails, nextPayload.pickupTicket.ticket.ticketId, nextPayload.pickupTicket);
        nextPickupTickets = replacePickupTicketInList(nextPickupTickets, nextPayload.pickupTicket.ticket, nextPayload.pickupTicket.ticket.ticketId);
      }

      const nextSnapshot = {
        items: nextItems,
        historyItems: nextHistoryItems,
        pickupTickets: nextPickupTickets,
        pickupTicketDetails: nextPickupTicketDetails,
        pendingMutations: nextPendingMutations,
        syncStatus: nextPayload.syncStatus || "idle",
        lastSyncAt: typeof nextPayload.lastSyncAt === "string" ? nextPayload.lastSyncAt : snapshot.lastSyncAt || "",
        dataSource: nextPayload.dataSource || (nextPendingMutations.length ? "remote-with-pending" : "remote-cache")
      };

      writeSnapshot(nextSnapshot);
      return {
        items: nextSnapshot.items.slice(),
        historyItems: nextSnapshot.historyItems.slice(),
        pickupTickets: nextSnapshot.pickupTickets.slice(),
        meta: getMeta(nextSnapshot)
      };
    }

    function saveOptimisticPickupTicketCreate(request) {
      const snapshot = readSnapshot();
      const createdAt = new Date().toISOString();
      const ticketId = "tmp_pt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      const lines = (Array.isArray(request && request.lines) ? request.lines : []).map(function(line, index) {
        const quantity = line && line.requestQuantity != null ? Number(line.requestQuantity || 0) : null;
        const unit = String(line && line.requestUnit || "").trim();
        const lineId = "tmp_ptl_" + Date.now() + "_" + index + "_" + Math.random().toString(36).slice(2, 5);
        return {
          lineId: lineId,
          ticketId: ticketId,
          lineNumber: index + 1,
          reference: deps.normalizeReference(line && line.reference),
          status: "to_confirm",
          requestUnit: unit,
          requestQuantity: quantity,
          requestedDisplay: quantity && unit ? (quantity + (unit === "box" ? "箱" : (unit === "pack" ? "包" : "件"))) : "",
          pickedUnit: "",
          pickedQuantity: null,
          pickedDisplay: "",
          stockAvailablePiecesSnapshot: null,
          warehouseHelpDisplay: "",
          arrivalNoteSnapshot: "",
          lineNote: "",
          stockMutationId: "",
          createdAt: createdAt,
          updatedAt: createdAt
        };
      });
      const counters = computePickupTicketCounters(lines);
      const ticket = {
        ticketId: ticketId,
        ticketNumber: buildTempPickupTicketNumber(snapshot, createdAt),
        status: "in_progress",
        createdAt: createdAt,
        createdBy: String(request && request.createdBy || "").trim(),
        updatedAt: createdAt,
        validatedAt: "",
        validatedBy: "",
        title: String(request && request.title || "").trim(),
        requestTextRaw: String(request && request.requestTextRaw || "").trim(),
        globalNote: String(request && request.globalNote || "").trim(),
        lineCount: counters.lineCount,
        resolvedLineCount: counters.resolvedLineCount,
        blockedLineCount: counters.blockedLineCount,
        version: 0
      };
      const detail = {
        ticket: ticket,
        lines: lines,
        events: [{
          eventId: "tmp_pte_" + Date.now(),
          ticketId: ticketId,
          lineId: "",
          eventType: "ticket_created",
          actor: String(request && request.createdBy || "").trim(),
          createdAt: createdAt,
          payload: { requestTextRaw: ticket.requestTextRaw },
          message: buildPickupTicketEventMessage("ticket_created")
        }]
      };
      const pendingMutation = buildPendingTicketMutation_("create_pickup_ticket", {
        clientTicketId: ticketId,
        title: String(request && request.title || "").trim(),
        requestTextRaw: String(request && request.requestTextRaw || "").trim(),
        globalNote: String(request && request.globalNote || "").trim(),
        createdBy: String(request && request.createdBy || "").trim(),
        lines: lines.map(function(line) {
          return {
            clientLineId: line.lineId,
            reference: line.reference,
            requestUnit: line.requestUnit,
            requestQuantity: line.requestQuantity
          };
        })
      }, { ticketId: ticketId });
      const nextSnapshot = {
        items: snapshot.items.slice(),
        historyItems: snapshot.historyItems.slice(),
        pickupTickets: replacePickupTicketInList(snapshot.pickupTickets, ticket, ticketId),
        pickupTicketDetails: upsertPickupTicketDetail(snapshot.pickupTicketDetails, ticketId, detail),
        pendingMutations: snapshot.pendingMutations.slice().concat(pendingMutation),
        syncStatus: "idle",
        lastSyncAt: snapshot.lastSyncAt,
        dataSource: "local-pending"
      };
      writeSnapshot(nextSnapshot);
      return {
        ticket: ticket,
        lines: lines,
        events: detail.events,
        items: nextSnapshot.pickupTickets.slice(),
        mutation: pendingMutation,
        meta: getMeta(nextSnapshot)
      };
    }

    function replaceOptimisticPickupTicket(tempTicketId, payload) {
      const snapshot = readSnapshot();
      const detail = payload && payload.ticket ? {
        ticket: payload.ticket,
        lines: Array.isArray(payload.lines) ? payload.lines : [],
        events: Array.isArray(payload.events) ? payload.events : []
      } : null;
      let nextTickets = removePickupTicketFromList(snapshot.pickupTickets, tempTicketId);
      let nextDetails = removePickupTicketDetail(snapshot.pickupTicketDetails, tempTicketId);
      if (detail && detail.ticket) {
        nextTickets = replacePickupTicketInList(nextTickets, detail.ticket, detail.ticket.ticketId);
        nextDetails = upsertPickupTicketDetail(nextDetails, detail.ticket.ticketId, detail);
      }
      const nextSnapshot = {
        items: snapshot.items.slice(),
        historyItems: snapshot.historyItems.slice(),
        pickupTickets: nextTickets,
        pickupTicketDetails: nextDetails,
        pendingMutations: snapshot.pendingMutations.slice(),
        syncStatus: snapshot.syncStatus,
        lastSyncAt: snapshot.lastSyncAt,
        dataSource: snapshot.dataSource
      };
      writeSnapshot(nextSnapshot);
      return {
        items: nextSnapshot.pickupTickets.slice(),
        detail: detail,
        meta: getMeta(nextSnapshot)
      };
    }

    function discardOptimisticPickupTicket(ticketId) {
      const snapshot = readSnapshot();
      const nextSnapshot = {
        items: snapshot.items.slice(),
        historyItems: snapshot.historyItems.slice(),
        pickupTickets: removePickupTicketFromList(snapshot.pickupTickets, ticketId),
        pickupTicketDetails: removePickupTicketDetail(snapshot.pickupTicketDetails, ticketId),
        pendingMutations: snapshot.pendingMutations.slice(),
        syncStatus: snapshot.syncStatus,
        lastSyncAt: snapshot.lastSyncAt,
        dataSource: snapshot.dataSource
      };
      writeSnapshot(nextSnapshot);
      return {
        items: nextSnapshot.pickupTickets.slice(),
        meta: getMeta(nextSnapshot)
      };
    }

    function saveOptimisticPickupTicketDetail(detail, pendingMutation) {
      const snapshot = readSnapshot();
      if (!detail || !detail.ticket || !detail.ticket.ticketId) return null;
      const nextPendingMutations = snapshot.pendingMutations.slice();
      if (pendingMutation) nextPendingMutations.push(cloneRequestPayload(pendingMutation));
      let nextItems = snapshot.items.slice();
      let nextHistoryItems = snapshot.historyItems.slice();
      if (pendingMutation && pendingMutation.type === "validate_pickup_ticket") {
        const projected = {
          items: nextItems,
          historyItems: nextHistoryItems,
          pendingMutations: []
        };
        applyPendingValidatePickupTicketMutation_(projected, pendingMutation);
        nextItems = projected.items;
        nextHistoryItems = projected.historyItems;
      }
      const nextSnapshot = {
        items: nextItems,
        historyItems: nextHistoryItems,
        pickupTickets: replacePickupTicketInList(snapshot.pickupTickets, detail.ticket, detail.ticket.ticketId),
        pickupTicketDetails: upsertPickupTicketDetail(snapshot.pickupTicketDetails, detail.ticket.ticketId, detail),
        pendingMutations: nextPendingMutations,
        syncStatus: "idle",
        lastSyncAt: snapshot.lastSyncAt,
        dataSource: pendingMutation ? "local-pending" : snapshot.dataSource
      };
      writeSnapshot(nextSnapshot);
      return {
        items: nextSnapshot.pickupTickets.slice(),
        detail: clonePickupTicketDetail(detail),
        meta: getMeta(nextSnapshot)
      };
    }

    function savePickupTicketsBootstrap(payload) {
      const snapshot = readSnapshot();
      const safePayload = payload || {};
      const nextDetails = {};
      const rawDetails = safePayload.detailsById && typeof safePayload.detailsById === "object" ? safePayload.detailsById : {};
      Object.keys(rawDetails).forEach(function(ticketId) {
        const detail = rawDetails[ticketId];
        if (!detail || !detail.ticket) return;
        nextDetails[String(ticketId)] = clonePickupTicketDetail(detail);
      });
      const preservedTickets = preserveLocalPendingTickets_(
        Array.isArray(safePayload.items) ? safePayload.items.slice() : snapshot.pickupTickets.slice(),
        nextDetails,
        snapshot,
        snapshot.pendingMutations
      );
      const nextSnapshot = {
        items: snapshot.items.slice(),
        historyItems: snapshot.historyItems.slice(),
        pickupTickets: preservedTickets.pickupTickets,
        pickupTicketDetails: preservedTickets.pickupTicketDetails,
        pendingMutations: snapshot.pendingMutations.slice(),
        syncStatus: snapshot.syncStatus,
        lastSyncAt: typeof safePayload.generatedAt === "string" ? safePayload.generatedAt : snapshot.lastSyncAt,
        dataSource: snapshot.dataSource
      };
      writeSnapshot(nextSnapshot);
      return {
        items: nextSnapshot.pickupTickets.slice(),
        meta: getMeta(nextSnapshot)
      };
    }

    return {
      loadInventory: loadInventory,
      loadHistory: loadHistory,
      loadDetail: loadDetail,
      loadPickupTickets: loadPickupTickets,
      loadPickupTicket: loadPickupTicket,
      saveQuickEdit: saveQuickEdit,
      saveProductRemark: saveProductRemark,
      saveOptimisticPickupTicketCreate: saveOptimisticPickupTicketCreate,
      replaceOptimisticPickupTicket: replaceOptimisticPickupTicket,
      discardOptimisticPickupTicket: discardOptimisticPickupTicket,
      saveOptimisticPickupTicketDetail: saveOptimisticPickupTicketDetail,
      savePickupTicketsBootstrap: savePickupTicketsBootstrap,
      mergeRemoteSnapshot: mergeRemoteSnapshot,
      commitSyncedMutation: commitSyncedMutation,
      getMeta: function() {
        return getMeta(readSnapshot());
      }
    };
  };
}());
