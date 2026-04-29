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
            response = SyncResponseDTO(inventory: inventory, history: history, generatedAt: inventory.generatedAt ?? history.generatedAt, source: "legacy_routes_fallback")
        }

        let items = response.inventory.items.map(InventoryItem.init(dto:))
        let entries = response.history.items.map(HistoryEntry.init(dto:))
        try replaceInventoryCache(with: items)
        try replaceHistoryCache(with: entries)

        let syncDate = Date()
        syncMetadataStore.setSyncDate(syncDate, for: SyncMetadataStore.ResourceKey.globalSync.rawValue)
        syncMetadataStore.setSyncDate(syncDate, for: SyncMetadataStore.ResourceKey.inventory.rawValue)
        syncMetadataStore.setSyncDate(syncDate, for: SyncMetadataStore.ResourceKey.history.rawValue)
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
}
