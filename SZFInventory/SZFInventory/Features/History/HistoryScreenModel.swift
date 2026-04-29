import Foundation
import Observation

@MainActor
@Observable
final class HistoryScreenModel {
    private let repository: HistoryRepository
    private let appSyncRepository: AppSyncRepository
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

    init(repository: HistoryRepository, appSyncRepository: AppSyncRepository, syncMetadataStore: SyncMetadataStore, refreshCoordinator: RefreshCoordinator) {
        self.repository = repository
        self.appSyncRepository = appSyncRepository
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

    var visibleSections: [HistoryDateSection] {
        var sections: [HistoryDateSection] = []
        for entry in visibleEntries {
            let label = DateFormatters.historyGroupLabel(timestampRaw: entry.timestampRaw)
            if sections.last?.title == label {
                sections[sections.count - 1].entries.append(entry)
            } else {
                sections.append(HistoryDateSection(title: label, entries: [entry]))
            }
        }
        return sections
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

    var syncInProgressLabel: String {
        refreshCoordinator.activeSyncLabel ?? "Sync en cours…"
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
    }

    func reloadFromCache() async {
        do {
            allEntries = try await repository.loadHistory()
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.history.rawValue)
        } catch {
            if allEntries.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
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
            if allEntries.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
    }
}

struct HistoryDateSection: Identifiable {
    let id: String
    let title: String
    var entries: [HistoryEntry]

    init(title: String, entries: [HistoryEntry]) {
        id = title
        self.title = title
        self.entries = entries
    }
}
