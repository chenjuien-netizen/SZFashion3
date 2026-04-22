import Observation
import SwiftData
import SwiftUI

@MainActor
@Observable
final class AppDependencies {
    let apiClient: APIClient
    let syncMetadataStore: SyncMetadataStore
    let inventoryRepository: InventoryRepository
    let historyRepository: HistoryRepository
    let referenceRepository: ReferenceRepository
    let pickupTicketRepository: PickupTicketRepository

    init(modelContext: ModelContext, apiClient: APIClient) {
        let syncMetadataStore = SyncMetadataStore(modelContext: modelContext)
        self.apiClient = apiClient
        self.syncMetadataStore = syncMetadataStore
        self.inventoryRepository = LiveInventoryRepository(modelContext: modelContext, apiClient: apiClient, syncMetadataStore: syncMetadataStore)
        self.historyRepository = LiveHistoryRepository(modelContext: modelContext, apiClient: apiClient, syncMetadataStore: syncMetadataStore)
        self.referenceRepository = LiveReferenceRepository(modelContext: modelContext, apiClient: apiClient, syncMetadataStore: syncMetadataStore)
        self.pickupTicketRepository = LivePickupTicketRepository(modelContext: modelContext, apiClient: apiClient, syncMetadataStore: syncMetadataStore)
    }

    static let preview: AppDependencies = {
        let context = ModelContext(previewContainer)
        return AppDependencies(modelContext: context, apiClient: APIClient(configuration: .preview))
    }()
}
