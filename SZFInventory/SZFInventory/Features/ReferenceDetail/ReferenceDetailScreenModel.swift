import Foundation
import Observation

@MainActor
@Observable
final class ReferenceDetailScreenModel {
    let reference: String

    private let repository: ReferenceRepository
    private let appSyncRepository: AppSyncRepository
    private let syncMetadataStore: SyncMetadataStore
    private let refreshCoordinator: RefreshCoordinator

    var detail: ReferenceDetail?
    var isLoading = false
    var isRefreshing = false
    var errorMessage: String?
    var lastSyncAt: Date?
    private var hasLoaded = false
    private var refreshTask: Task<Void, Never>?

    init(reference: String, repository: ReferenceRepository, appSyncRepository: AppSyncRepository, syncMetadataStore: SyncMetadataStore, refreshCoordinator: RefreshCoordinator) {
        self.reference = reference
        self.repository = repository
        self.appSyncRepository = appSyncRepository
        self.syncMetadataStore = syncMetadataStore
        self.refreshCoordinator = refreshCoordinator
    }

    func load() async {
        guard !hasLoaded else { return }
        isLoading = true
        do {
            detail = try await repository.loadDetail(reference: reference)
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.globalSync.rawValue)
                ?? syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.inventory.rawValue)
            hasLoaded = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func reloadFromCache() async {
        do {
            detail = try await repository.loadDetail(reference: reference)
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.globalSync.rawValue)
                ?? syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.inventory.rawValue)
        } catch {
            if detail == nil {
                errorMessage = error.localizedDescription
            }
        }
    }

    var isSyncInProgress: Bool {
        isRefreshing || refreshCoordinator.isRefreshing
    }

    var syncInProgressLabel: String {
        refreshCoordinator.activeSyncLabel ?? "Sync en cours…"
    }

    var syncCompletedAt: Date? {
        refreshCoordinator.lastCompletedAt
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
        let resource = RefreshCoordinator.globalSyncResource
        guard refreshCoordinator.begin(resource) else { return }
        isRefreshing = true
        defer {
            isRefreshing = false
            refreshCoordinator.end(resource)
        }

        errorMessage = nil
        do {
            try await appSyncRepository.refreshAll()
            await reloadFromCache()
        } catch {
            if detail == nil {
                errorMessage = error.localizedDescription
            }
        }
    }
}
