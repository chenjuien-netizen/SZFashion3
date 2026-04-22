import Foundation
import Observation

@MainActor
@Observable
final class ReferenceDetailScreenModel {
    let reference: String

    private let repository: ReferenceRepository
    private let syncMetadataStore: SyncMetadataStore

    var detail: ReferenceDetail?
    var isLoading = false
    var isRefreshing = false
    var errorMessage: String?
    var lastSyncAt: Date?
    private var hasLoaded = false

    init(reference: String, repository: ReferenceRepository, syncMetadataStore: SyncMetadataStore) {
        self.reference = reference
        self.repository = repository
        self.syncMetadataStore = syncMetadataStore
    }

    func load() async {
        guard !hasLoaded else { return }
        isLoading = true
        do {
            detail = try await repository.loadDetail(reference: reference)
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.detail(reference: reference))
            hasLoaded = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
        await refreshIfNeeded(force: false)
    }

    func refreshIfNeeded(force: Bool) async {
        guard force || shouldRefresh else { return }
        await refresh()
    }

    func refresh() async {
        isRefreshing = true
        errorMessage = nil
        do {
            detail = try await repository.refreshDetail(reference: reference)
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.detail(reference: reference))
        } catch {
            if detail == nil {
                errorMessage = error.localizedDescription
            }
        }
        isRefreshing = false
    }

    private var shouldRefresh: Bool {
        guard let lastSyncAt else { return true }
        return Date().timeIntervalSince(lastSyncAt) > 300
    }
}
