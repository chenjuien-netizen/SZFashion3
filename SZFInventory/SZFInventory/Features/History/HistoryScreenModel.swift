import Foundation
import Observation

@MainActor
@Observable
final class HistoryScreenModel {
    private let repository: HistoryRepository
    private let syncMetadataStore: SyncMetadataStore
    private let refreshCoordinator: RefreshCoordinator

    var allEntries: [HistoryEntry] = []
    var searchText = ""
    var actionFilter = ""
    var isLoading = false
    var isRefreshing = false
    var errorMessage: String?
    var lastSyncAt: Date?
    private var hasLoaded = false
    private var refreshTask: Task<Void, Never>?

    init(repository: HistoryRepository, syncMetadataStore: SyncMetadataStore, refreshCoordinator: RefreshCoordinator) {
        self.repository = repository
        self.syncMetadataStore = syncMetadataStore
        self.refreshCoordinator = refreshCoordinator
    }

    var visibleEntries: [HistoryEntry] {
        let trimmedQuery = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return allEntries.filter { entry in
            let matchesFilter = actionFilter.isEmpty || entry.actionType.rawValueForFilter == actionFilter
            let haystack = [entry.reference, entry.beforeDisplay, entry.afterDisplay, entry.remark, entry.source]
                .joined(separator: " ")
                .lowercased()
            let matchesQuery = trimmedQuery.isEmpty || haystack.contains(trimmedQuery)
            return matchesFilter && matchesQuery
        }
    }

    var availableFilters: [(label: String, value: String)] {
        [
            ("Tous", ""),
            ("Entrées", "entry"),
            ("Sorties", "exit"),
            ("Ajustements", "adjustment"),
            ("Tickets", "pickup_ticket")
        ]
    }

    var actionFilterLabel: String {
        availableFilters.first { $0.value == actionFilter }?.label ?? "Tous"
    }

    var isSyncInProgress: Bool {
        isRefreshing || refreshCoordinator.isRefreshing
    }

    func load() async {
        guard !hasLoaded else { return }
        isLoading = true
        do {
            allEntries = try await repository.loadHistory()
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.history.rawValue)
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
        let resource = SyncMetadataStore.ResourceKey.history.rawValue
        guard refreshCoordinator.begin(resource) else { return }
        isRefreshing = true
        defer {
            isRefreshing = false
            refreshCoordinator.end(resource)
        }

        errorMessage = nil
        do {
            allEntries = try await repository.refreshHistory()
            lastSyncAt = syncMetadataStore.syncDate(for: resource)
        } catch {
            if allEntries.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
    }

    private var shouldRefresh: Bool {
        guard let lastSyncAt else { return true }
        return Date().timeIntervalSince(lastSyncAt) > 180
    }
}
