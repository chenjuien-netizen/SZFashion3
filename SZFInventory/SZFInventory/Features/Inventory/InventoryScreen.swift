import SwiftUI

struct InventoryRootView: View {
    @State private var model: InventoryScreenModel
    @State private var filterDraft: InventoryFilterDraft?
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    let onMenuTap: () -> Void

    init(dependencies: AppDependencies, onMenuTap: @escaping () -> Void = {}) {
        _model = State(initialValue: InventoryScreenModel(repository: dependencies.inventoryRepository, syncMetadataStore: dependencies.syncMetadataStore))
        self.onMenuTap = onMenuTap
    }

    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                NavigationSplitView {
                    inventoryList
                } detail: {
                    if let reference = model.selectedReference {
                        ReferenceDetailScreen(
                            model: ReferenceDetailScreenModel(
                                reference: reference,
                                repository: dependencies.referenceRepository,
                                syncMetadataStore: dependencies.syncMetadataStore
                            )
                        )
                    } else {
                        ContentUnavailableView("Sélectionne une référence", systemImage: "shippingbox")
                    }
                }
            } else {
                NavigationStack {
                    inventoryList
                        .navigationDestination(for: InventoryItem.self) { item in
                            ReferenceDetailScreen(
                                model: ReferenceDetailScreenModel(
                                    reference: item.reference,
                                    repository: dependencies.referenceRepository,
                                    syncMetadataStore: dependencies.syncMetadataStore
                                )
                            )
                        }
                }
            }
        }
        .task {
            await model.load()
        }
        .sheet(item: $filterDraft) { draft in
            InventoryFilterSheet(draft: draft) { sortMode, stockFilter in
                model.selectedSortMode = sortMode
                model.stockFilter = stockFilter
            } onReset: {
                model.resetFilters()
            }
        }
    }

    @Environment(AppDependencies.self) private var dependencies

    private var inventoryList: some View {
        List(selection: $model.selectedReference) {
            InventoryStatusRow(model: model)

            ForEach(model.visibleItems) { item in
                if horizontalSizeClass == .regular {
                    InventoryRow(item: item)
                        .tag(item.reference)
                } else {
                    NavigationLink(value: item) {
                        InventoryRow(item: item)
                    }
                    .contentShape(Rectangle())
                }
            }
        }
        .overlay {
            if model.isLoading && model.visibleItems.isEmpty {
                ProgressView("Chargement inventaire…")
            } else if let errorMessage = model.errorMessage, model.visibleItems.isEmpty {
                ContentUnavailableView("Inventaire indisponible", systemImage: "wifi.exclamationmark", description: Text(errorMessage))
            } else if model.visibleItems.isEmpty {
                ContentUnavailableView.search(text: model.searchText)
            }
        }
        .listStyle(.plain)
        .navigationTitle("Inventaire")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $model.searchText, prompt: "Recherche référence / stock")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    onMenuTap()
                } label: {
                    Label("Menu", systemImage: "line.3.horizontal")
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    filterDraft = InventoryFilterDraft(sortMode: model.selectedSortMode, stockFilter: model.stockFilter)
                } label: {
                    Label(
                        model.hasActiveFilters ? "Filtres actifs" : "Filtrer",
                        systemImage: model.hasActiveFilters ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle"
                    )
                }
            }
        }
        .refreshable {
            model.triggerBackgroundRefresh()
        }
    }
}

private struct InventoryFilterDraft: Identifiable {
    let id = UUID()
    var sortMode: InventoryScreenModel.SortMode
    var stockFilter: InventoryScreenModel.StockFilter
}

private struct InventoryStatusRow: View {
    let model: InventoryScreenModel

    var body: some View {
        HStack(spacing: 8) {
            Text(model.summaryText)
            if model.hasActiveFilters {
                Text("Filtres actifs")
            }
            Spacer(minLength: 8)
            Text(DateFormatters.syncLabel(prefix: "Sync", from: model.lastSyncAt))
                .multilineTextAlignment(.trailing)
        }
        .font(.caption.weight(.medium))
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 2, trailing: 16))
        .listRowSeparator(.hidden)
        .accessibilityElement(children: .combine)
    }
}

private struct InventoryFilterSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var sortMode: InventoryScreenModel.SortMode
    @State private var stockFilter: InventoryScreenModel.StockFilter

    let onApply: (InventoryScreenModel.SortMode, InventoryScreenModel.StockFilter) -> Void
    let onReset: () -> Void

    init(
        draft: InventoryFilterDraft,
        onApply: @escaping (InventoryScreenModel.SortMode, InventoryScreenModel.StockFilter) -> Void,
        onReset: @escaping () -> Void
    ) {
        _sortMode = State(initialValue: draft.sortMode)
        _stockFilter = State(initialValue: draft.stockFilter)
        self.onApply = onApply
        self.onReset = onReset
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Tri") {
                    Picker("Tri", selection: $sortMode) {
                        ForEach(InventoryScreenModel.SortMode.allCases) { mode in
                            Text(mode.label).tag(mode)
                        }
                    }
                    .pickerStyle(.inline)
                }

                Section("Stock") {
                    Picker("Stock", selection: $stockFilter) {
                        ForEach(InventoryScreenModel.StockFilter.allCases) { filter in
                            Text(filter.label).tag(filter)
                        }
                    }
                    .pickerStyle(.inline)
                }

                Section {
                    Button("Réinitialiser", role: .destructive) {
                        sortMode = .arrival
                        stockFilter = .all
                        onReset()
                        dismiss()
                    }
                }
            }
            .navigationTitle("Filtrer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Appliquer") {
                        onApply(sortMode, stockFilter)
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

private struct InventoryRow: View {
    let item: InventoryItem

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(item.reference)
                    .font(.headline)
                Spacer()
                Text(item.stockState == .inStock ? "En stock" : "Rupture")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(item.stockState == .inStock ? .green : .secondary)
            }

            Text(item.stockDisplay)
                .font(.system(.subheadline, design: .monospaced))

            HStack {
                Label(item.warehouse.isEmpty ? "-" : item.warehouse, systemImage: "building.2")
                Spacer()
                Label(item.arrivalNote.isEmpty ? "-" : item.arrivalNote, systemImage: "tray.full")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
