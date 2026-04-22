import Foundation
import Observation

@MainActor
@Observable
final class HistoryScreenModel {
    private let repository: HistoryRepository
    private let syncMetadataStore: SyncMetadataStore

    var allEntries: [HistoryEntry] = []
    var searchText = ""
    var actionFilter = ""
    var isLoading = false
    var isRefreshing = false
    var errorMessage: String?
    var lastSyncAt: Date?
    private var hasLoaded = false

    init(repository: HistoryRepository, syncMetadataStore: SyncMetadataStore) {
        self.repository = repository
        self.syncMetadataStore = syncMetadataStore
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
            ("Pickup", "pickup_ticket")
        ]
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

    func refresh() async {
        isRefreshing = true
        errorMessage = nil
        do {
            allEntries = try await repository.refreshHistory()
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.history.rawValue)
        } catch {
            if allEntries.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
        isRefreshing = false
    }

    private var shouldRefresh: Bool {
        guard let lastSyncAt else { return true }
        return Date().timeIntervalSince(lastSyncAt) > 180
    }
}
