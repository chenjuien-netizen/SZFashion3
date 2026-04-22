import SwiftUI

struct InventoryRootView: View {
    @State private var model: InventoryScreenModel
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    init(dependencies: AppDependencies) {
        _model = State(initialValue: InventoryScreenModel(repository: dependencies.inventoryRepository, syncMetadataStore: dependencies.syncMetadataStore))
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
                        .navigationDestination(for: String.self) { reference in
                            ReferenceDetailScreen(
                                model: ReferenceDetailScreenModel(
                                    reference: reference,
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
    }

    @Environment(AppDependencies.self) private var dependencies

    private var inventoryList: some View {
        List(model.visibleItems, selection: $model.selectedReference) { item in
            if horizontalSizeClass == .regular {
                InventoryRow(item: item)
                    .tag(item.reference)
            } else {
                NavigationLink(value: item.reference) {
                    InventoryRow(item: item)
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
        .searchable(text: $model.searchText, prompt: "Recherche référence / stock")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if model.isRefreshing {
                    ProgressView()
                } else {
                    Button {
                        Task { await model.refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .safeAreaInset(edge: .top) {
            InventoryHeader(model: model)
        }
        .refreshable {
            await model.refresh()
        }
    }
}

private struct InventoryHeader: View {
    let model: InventoryScreenModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(model.summaryText)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)

            Picker("Tri", selection: Binding(get: { model.selectedSortMode }, set: { model.selectedSortMode = $0 })) {
                ForEach(InventoryScreenModel.SortMode.allCases) { mode in
                    Text(mode.label).tag(mode)
                }
            }
            .pickerStyle(.segmented)

            HStack {
                Text("Dernière sync")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(model.lastSyncAt.map(DateFormatters.relativeString(from:)) ?? "Jamais")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.thinMaterial)
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
