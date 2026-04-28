import Foundation
import Observation

@MainActor
@Observable
final class InventoryScreenModel {
    enum SortMode: String, CaseIterable, Identifiable {
        case reference
        case warehouse
        case stock
        case arrival

        var id: String { rawValue }

        var label: String {
            switch self {
            case .reference: return "Référence"
            case .warehouse: return "Entrepôt"
            case .stock: return "Stock"
            case .arrival: return "到货单"
            }
        }
    }

    enum StockFilter: String, CaseIterable, Identifiable {
        case all
        case inStock
        case outOfStock

        var id: String { rawValue }

        var label: String {
            switch self {
            case .all: return "Tous"
            case .inStock: return "En stock"
            case .outOfStock: return "Rupture"
            }
        }
    }

    private let repository: InventoryRepository
    private let syncMetadataStore: SyncMetadataStore
    private let refreshCoordinator: RefreshCoordinator

    var allItems: [InventoryItem] = []
    var searchText = ""
    var selectedSortMode: SortMode = .arrival
    var stockFilter: StockFilter = .all
    var isLoading = false
    var isRefreshing = false
    var errorMessage: String?
    var lastSyncAt: Date?
    var selectedReference: String?
    private var hasLoaded = false
    private var refreshTask: Task<Void, Never>?

    init(repository: InventoryRepository, syncMetadataStore: SyncMetadataStore, refreshCoordinator: RefreshCoordinator) {
        self.repository = repository
        self.syncMetadataStore = syncMetadataStore
        self.refreshCoordinator = refreshCoordinator
    }

    var visibleItems: [InventoryItem] {
        let trimmedQuery = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let filtered = allItems.filter { item in
            let matchesStockFilter: Bool
            switch stockFilter {
            case .all:
                matchesStockFilter = true
            case .inStock:
                matchesStockFilter = item.stockState == .inStock
            case .outOfStock:
                matchesStockFilter = item.stockState == .outOfStock
            }

            guard matchesStockFilter else { return false }
            guard !trimmedQuery.isEmpty else { return true }

            return [item.reference, item.warehouse, item.arrivalNote, item.stockDisplay, item.remark]
                .joined(separator: " ")
                .lowercased()
                .contains(trimmedQuery)
        }

        switch selectedSortMode {
        case .reference:
            return filtered.sorted { $0.reference < $1.reference }
        case .warehouse:
            return filtered.sorted { ($0.warehouse, $0.reference) < ($1.warehouse, $1.reference) }
        case .stock:
            return filtered.sorted { ($0.stockDisplay, $0.reference) > ($1.stockDisplay, $1.reference) }
        case .arrival:
            return filtered.sorted { ($0.sortKey ?? "", $0.reference) > ($1.sortKey ?? "", $1.reference) }
        }
    }

    var summaryText: String {
        let inStockCount = visibleItems.filter { $0.stockState == .inStock }.count
        return "\(visibleItems.count) refs • \(inStockCount) en stock"
    }

    var filterSummaryText: String {
        if selectedSortMode == .arrival && stockFilter == .all {
            return "Tri : 到货单"
        }
        return "Tri : \(selectedSortMode.label) • Stock : \(stockFilter.label)"
    }

    var hasActiveFilters: Bool {
        selectedSortMode != .arrival || stockFilter != .all
    }

    var isSyncInProgress: Bool {
        isRefreshing || refreshCoordinator.isRefreshing
    }

    var syncInProgressLabel: String {
        refreshCoordinator.activeSyncLabel ?? "Sync en cours…"
    }

    func resetFilters() {
        selectedSortMode = .arrival
        stockFilter = .all
    }

    func load() async {
        guard !hasLoaded else { return }
        isLoading = true
        errorMessage = nil
        do {
            allItems = try await repository.loadInventory()
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.inventory.rawValue)
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
        let resource = SyncMetadataStore.ResourceKey.inventory.rawValue
        guard refreshCoordinator.begin(resource) else { return }
        isRefreshing = true
        defer {
            isRefreshing = false
            refreshCoordinator.end(resource)
        }

        errorMessage = nil
        do {
            allItems = try await repository.refreshInventory()
            lastSyncAt = syncMetadataStore.syncDate(for: resource)
        } catch {
            if allItems.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
    }

    private var shouldRefresh: Bool {
        guard let lastSyncAt else { return true }
        return Date().timeIntervalSince(lastSyncAt) > 300
    }
}
