import Foundation
import Observation

@MainActor
@Observable
final class ReferenceDetailScreenModel {
    let reference: String

    private let repository: ReferenceRepository
    private let syncMetadataStore: SyncMetadataStore
    private let refreshCoordinator: RefreshCoordinator

    var detail: ReferenceDetail?
    var isLoading = false
    var isRefreshing = false
    var errorMessage: String?
    var lastSyncAt: Date?
    private var hasLoaded = false
    private var refreshTask: Task<Void, Never>?

    init(reference: String, repository: ReferenceRepository, syncMetadataStore: SyncMetadataStore, refreshCoordinator: RefreshCoordinator) {
        self.reference = reference
        self.repository = repository
        self.syncMetadataStore = syncMetadataStore
        self.refreshCoordinator = refreshCoordinator
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

    func triggerBackgroundRefresh() {
        guard !isRefreshing, refreshTask == nil, !refreshCoordinator.isRefreshing else { return }
        refreshTask = Task { [weak self] in
            guard let self else { return }
            defer {
                self.refreshTask = nil
            }
            await self.refresh()
        }
    }

    func refresh() async {
        let resource = SyncMetadataStore.ResourceKey.detail(reference: reference)
        guard refreshCoordinator.begin(resource) else { return }
        isRefreshing = true
        defer {
            isRefreshing = false
            refreshCoordinator.end(resource)
        }

        errorMessage = nil
        do {
            detail = try await repository.refreshDetail(reference: reference)
            lastSyncAt = syncMetadataStore.syncDate(for: resource)
        } catch {
            if detail == nil {
                errorMessage = error.localizedDescription
            }
        }
    }

    private var shouldRefresh: Bool {
        guard let lastSyncAt else { return true }
        return Date().timeIntervalSince(lastSyncAt) > 300
    }
}
