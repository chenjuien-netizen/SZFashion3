import Foundation
import SwiftData

@MainActor
final class LiveAppSyncRepository: AppSyncRepository {
    private let modelContext: ModelContext
    private let apiClient: APIClient
    private let syncMetadataStore: SyncMetadataStore

    init(modelContext: ModelContext, apiClient: APIClient, syncMetadataStore: SyncMetadataStore) {
        self.modelContext = modelContext
        self.apiClient = apiClient
        self.syncMetadataStore = syncMetadataStore
    }

    func refreshAll() async throws {
        let response: SyncResponseDTO
        do {
            response = try await apiClient.fetchSync()
        } catch {
            let inventory = try await apiClient.fetchInventory()
            let history = try await apiClient.fetchHistory()
            let ticketsBootstrap = try? await apiClient.fetchPickupTicketsBootstrap()
            response = SyncResponseDTO(
                inventory: inventory,
                history: history,
                ticketsBootstrap: ticketsBootstrap,
                generatedAt: inventory.generatedAt ?? history.generatedAt ?? ticketsBootstrap?.generatedAt,
                source: "legacy_routes_fallback"
            )
        }

        let items = response.inventory.items.map(InventoryItem.init(dto:))
        let entries = response.history.items.map(HistoryEntry.init(dto:))
        try replaceInventoryCache(with: items)
        try replaceHistoryCache(with: entries)
        if let ticketsBootstrap = response.ticketsBootstrap {
            try replacePickupTicketCache(with: ticketsBootstrap)
        }

        let syncDate = Date()
        syncMetadataStore.setSyncDate(syncDate, for: SyncMetadataStore.ResourceKey.globalSync.rawValue)
        syncMetadataStore.setSyncDate(syncDate, for: SyncMetadataStore.ResourceKey.inventory.rawValue)
        syncMetadataStore.setSyncDate(syncDate, for: SyncMetadataStore.ResourceKey.history.rawValue)
        if response.ticketsBootstrap != nil {
            syncMetadataStore.setSyncDate(syncDate, for: SyncMetadataStore.ResourceKey.pickupTickets.rawValue)
        }
    }

    private func replaceInventoryCache(with items: [InventoryItem]) throws {
        let existing = try modelContext.fetch(FetchDescriptor<InventoryItemRecord>())
        for record in existing {
            modelContext.delete(record)
        }
        for item in items {
            modelContext.insert(InventoryItemRecord(item: item))
        }
        try modelContext.save()
    }

    private func replaceHistoryCache(with entries: [HistoryEntry]) throws {
        let existing = try modelContext.fetch(FetchDescriptor<HistoryEntryRecord>())
        for record in existing {
            modelContext.delete(record)
        }
        for entry in entries {
            modelContext.insert(HistoryEntryRecord(entry: entry))
        }
        try modelContext.save()
    }

    private func replacePickupTicketCache(with response: PickupTicketsBootstrapResponseDTO) throws {
        let existingEvents = try modelContext.fetch(FetchDescriptor<PickupTicketEventRecord>())
        for record in existingEvents {
            modelContext.delete(record)
        }
        let existingLines = try modelContext.fetch(FetchDescriptor<PickupTicketLineRecord>())
        for record in existingLines {
            modelContext.delete(record)
        }
        let existingTickets = try modelContext.fetch(FetchDescriptor<PickupTicketRecord>())
        for record in existingTickets {
            modelContext.delete(record)
        }

        var ticketsById: [String: PickupTicket] = [:]
        for dto in response.items {
            ticketsById[dto.ticketId] = PickupTicket(dto: dto)
        }
        for ticket in ticketsById.values {
            modelContext.insert(PickupTicketRecord(ticket: ticket))
        }

        for (ticketId, detail) in response.detailsById {
            if let detailTicketDTO = detail.ticket, ticketsById[detailTicketDTO.ticketId] == nil {
                modelContext.insert(PickupTicketRecord(ticket: PickupTicket(dto: detailTicketDTO)))
            }
            for lineDTO in detail.lines {
                var line = PickupTicketLine(dto: lineDTO)
                if line.ticketId.isEmpty {
                    line = PickupTicketLine(
                        lineId: line.lineId,
                        ticketId: ticketId,
                        lineNumber: line.lineNumber,
                        reference: line.reference,
                        status: line.status,
                        requestUnit: line.requestUnit,
                        requestQuantity: line.requestQuantity,
                        requestedDisplay: line.requestedDisplay,
                        pickedUnit: line.pickedUnit,
                        pickedQuantity: line.pickedQuantity,
                        pickedDisplay: line.pickedDisplay,
                        stockAvailablePiecesSnapshot: line.stockAvailablePiecesSnapshot,
                        stockAvailableDisplaySnapshot: line.stockAvailableDisplaySnapshot,
                        warehouseHelpDisplay: line.warehouseHelpDisplay,
                        arrivalNoteSnapshot: line.arrivalNoteSnapshot,
                        lineNote: line.lineNote,
                        stockMutationId: line.stockMutationId,
                        createdAt: line.createdAt,
                        updatedAt: line.updatedAt
                    )
                }
                modelContext.insert(PickupTicketLineRecord(line: line))
            }
            for eventDTO in detail.events {
                var event = PickupTicketEvent(dto: eventDTO)
                if event.ticketId.isEmpty {
                    event = PickupTicketEvent(
                        eventId: event.eventId,
                        ticketId: ticketId,
                        lineId: event.lineId,
                        eventType: event.eventType,
                        actor: event.actor,
                        createdAt: event.createdAt,
                        message: event.message,
                        payload: event.payload
                    )
                }
                modelContext.insert(PickupTicketEventRecord(event: event))
            }
        }

        try modelContext.save()
    }
}
