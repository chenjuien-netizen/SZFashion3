import Foundation
import SwiftData

@MainActor
final class LiveInventoryRepository: InventoryRepository {
    private let modelContext: ModelContext
    private let apiClient: APIClient
    private let syncMetadataStore: SyncMetadataStore

    init(modelContext: ModelContext, apiClient: APIClient, syncMetadataStore: SyncMetadataStore) {
        self.modelContext = modelContext
        self.apiClient = apiClient
        self.syncMetadataStore = syncMetadataStore
    }

    func loadInventory() async throws -> [InventoryItem] {
        try fetchCachedInventory()
    }

    func refreshInventory() async throws -> [InventoryItem] {
        let response = try await apiClient.fetchInventory()
        let items = response.items.map(InventoryItem.init(dto:))
        try replaceInventoryCache(with: items)
        syncMetadataStore.setSyncDate(Date(), for: SyncMetadataStore.ResourceKey.inventory.rawValue)
        return items
    }

    private func fetchCachedInventory() throws -> [InventoryItem] {
        let descriptor = FetchDescriptor<InventoryItemRecord>(sortBy: [SortDescriptor(\InventoryItemRecord.reference)])
        return try modelContext.fetch(descriptor).map(\.domainModel)
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
}

@MainActor
final class LiveHistoryRepository: HistoryRepository {
    private let modelContext: ModelContext
    private let apiClient: APIClient
    private let syncMetadataStore: SyncMetadataStore

    init(modelContext: ModelContext, apiClient: APIClient, syncMetadataStore: SyncMetadataStore) {
        self.modelContext = modelContext
        self.apiClient = apiClient
        self.syncMetadataStore = syncMetadataStore
    }

    func loadHistory() async throws -> [HistoryEntry] {
        try fetchCachedHistory()
    }

    func refreshHistory() async throws -> [HistoryEntry] {
        let response = try await apiClient.fetchHistory()
        let entries = response.items.map(HistoryEntry.init(dto:))
        try replaceHistoryCache(with: entries)
        syncMetadataStore.setSyncDate(Date(), for: SyncMetadataStore.ResourceKey.history.rawValue)
        return entries
    }

    private func fetchCachedHistory() throws -> [HistoryEntry] {
        let descriptor = FetchDescriptor<HistoryEntryRecord>()
        return try modelContext.fetch(descriptor)
            .map(\.domainModel)
            .sorted { $0.timestampRaw > $1.timestampRaw }
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
}

@MainActor
final class LiveReferenceRepository: ReferenceRepository {
    private let modelContext: ModelContext
    private let apiClient: APIClient
    private let syncMetadataStore: SyncMetadataStore
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(modelContext: ModelContext, apiClient: APIClient, syncMetadataStore: SyncMetadataStore) {
        self.modelContext = modelContext
        self.apiClient = apiClient
        self.syncMetadataStore = syncMetadataStore
    }

    func loadDetail(reference: String) async throws -> ReferenceDetail {
        let normalized = reference.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let item = try fetchCachedInventoryItem(reference: normalized)
        let history = try fetchCachedHistory(reference: normalized)
        return ReferenceDetail(item: item, history: history, notFoundInStock: item == nil, lastMovementAt: history.first?.timestampRaw)
    }

    func refreshDetail(reference: String) async throws -> ReferenceDetail {
        let normalized = reference.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let response = try await apiClient.fetchDetail(reference: normalized)
        let detail = ReferenceDetail(
            item: response.item.map(InventoryItem.init(dto:)),
            history: response.history.map(HistoryEntry.init(dto:)),
            notFoundInStock: response.notFoundInStock ?? false,
            lastMovementAt: response.lastMovementAt
        )
        try store(detail: detail, reference: normalized)
        syncMetadataStore.setSyncDate(Date(), for: SyncMetadataStore.ResourceKey.detail(reference: normalized))
        return detail
    }

    private func fetchCachedDetail(reference: String) throws -> ReferenceDetail? {
        let descriptor = FetchDescriptor<ReferenceDetailCacheRecord>(predicate: #Predicate { $0.reference == reference })
        guard let record = try modelContext.fetch(descriptor).first else {
            return nil
        }
        let item = try record.itemData.flatMap { try decoder.decode(InventoryItem.self, from: $0) }
        let history = try decoder.decode([HistoryEntry].self, from: record.historyData)
        return ReferenceDetail(item: item, history: history, notFoundInStock: record.notFoundInStock, lastMovementAt: record.lastMovementAt)
    }

    private func fetchCachedInventoryItem(reference: String) throws -> InventoryItem? {
        let descriptor = FetchDescriptor<InventoryItemRecord>(predicate: #Predicate { $0.reference == reference })
        return try modelContext.fetch(descriptor).first?.domainModel
    }

    private func fetchCachedHistory(reference: String) throws -> [HistoryEntry] {
        let descriptor = FetchDescriptor<HistoryEntryRecord>(predicate: #Predicate { $0.reference == reference })
        return try modelContext.fetch(descriptor)
            .map(\.domainModel)
            .sorted { $0.timestampRaw > $1.timestampRaw }
    }

    private func store(detail: ReferenceDetail, reference: String) throws {
        let descriptor = FetchDescriptor<ReferenceDetailCacheRecord>(predicate: #Predicate { $0.reference == reference })
        let record = try modelContext.fetch(descriptor).first ?? ReferenceDetailCacheRecord(reference: reference, itemData: nil, historyData: Data(), notFoundInStock: false, lastMovementAt: nil, syncedAt: .now)
        record.itemData = try detail.item.map { try encoder.encode($0) }
        record.historyData = try encoder.encode(detail.history)
        record.notFoundInStock = detail.notFoundInStock
        record.lastMovementAt = detail.lastMovementAt
        record.syncedAt = .now
        if record.modelContext == nil {
            modelContext.insert(record)
        }
        try modelContext.save()
    }
}

@MainActor
final class LivePickupTicketRepository: PickupTicketRepository {
    private let modelContext: ModelContext
    private let apiClient: APIClient
    private let syncMetadataStore: SyncMetadataStore

    init(modelContext: ModelContext, apiClient: APIClient, syncMetadataStore: SyncMetadataStore) {
        self.modelContext = modelContext
        self.apiClient = apiClient
        self.syncMetadataStore = syncMetadataStore
    }

    func loadPickupTickets() async throws -> [PickupTicket] {
        let descriptor = FetchDescriptor<PickupTicketRecord>(sortBy: [SortDescriptor(\PickupTicketRecord.createdAt, order: .reverse)])
        return try modelContext.fetch(descriptor).map(\.domainModel)
    }

    func loadPickupTicketDetail(ticketID: String) async throws -> PickupTicketDetail? {
        let ticketDescriptor = FetchDescriptor<PickupTicketRecord>(predicate: #Predicate { $0.ticketId == ticketID })
        guard let ticket = try modelContext.fetch(ticketDescriptor).first?.domainModel else {
            return nil
        }

        let lineDescriptor = FetchDescriptor<PickupTicketLineRecord>(
            predicate: #Predicate { $0.ticketId == ticketID },
            sortBy: [SortDescriptor(\PickupTicketLineRecord.lineNumber)]
        )
        let eventDescriptor = FetchDescriptor<PickupTicketEventRecord>(
            predicate: #Predicate { $0.ticketId == ticketID },
            sortBy: [SortDescriptor(\PickupTicketEventRecord.createdAt)]
        )
        let lines = try modelContext.fetch(lineDescriptor).map(\.domainModel)
        let events = try modelContext.fetch(eventDescriptor).map(\.domainModel)
        return PickupTicketDetail(ticket: ticket, lines: lines, events: events)
    }

    func refreshPickupTickets() async throws -> [PickupTicket] {
        let response = try await apiClient.fetchPickupTicketsBootstrap()
        try replacePickupTicketCache(with: response)
        syncMetadataStore.setSyncDate(Date(), for: SyncMetadataStore.ResourceKey.pickupTickets.rawValue)
        return try await loadPickupTickets()
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
                let line = normalizedLine(from: lineDTO, fallbackTicketId: ticketId)
                modelContext.insert(PickupTicketLineRecord(line: line))
            }
            for eventDTO in detail.events {
                let event = normalizedEvent(from: eventDTO, fallbackTicketId: ticketId)
                modelContext.insert(PickupTicketEventRecord(event: event))
            }
        }
        try modelContext.save()
    }

    private func normalizedLine(from dto: PickupTicketLineDTO, fallbackTicketId: String) -> PickupTicketLine {
        let line = PickupTicketLine(dto: dto)
        guard line.ticketId.isEmpty else { return line }
        return PickupTicketLine(
            lineId: line.lineId,
            ticketId: fallbackTicketId,
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

    private func normalizedEvent(from dto: PickupTicketEventDTO, fallbackTicketId: String) -> PickupTicketEvent {
        let event = PickupTicketEvent(dto: dto)
        guard event.ticketId.isEmpty else { return event }
        return PickupTicketEvent(
            eventId: event.eventId,
            ticketId: fallbackTicketId,
            lineId: event.lineId,
            eventType: event.eventType,
            actor: event.actor,
            createdAt: event.createdAt,
            message: event.message,
            payload: event.payload
        )
    }
}
