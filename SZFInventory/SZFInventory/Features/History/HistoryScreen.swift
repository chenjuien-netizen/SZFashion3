import SwiftUI

struct HistoryRootView: View {
    @State private var model: HistoryScreenModel
    let onMenuTap: () -> Void

    init(dependencies: AppDependencies, onMenuTap: @escaping () -> Void = {}) {
        _model = State(initialValue: HistoryScreenModel(repository: dependencies.historyRepository, syncMetadataStore: dependencies.syncMetadataStore))
        self.onMenuTap = onMenuTap
    }

    @Environment(AppDependencies.self) private var dependencies

    var body: some View {
        NavigationStack {
            List(model.visibleEntries) { entry in
                if entry.reference.isEmpty {
                    HistoryRow(entry: entry)
                } else {
                    NavigationLink(value: entry.reference) {
                        HistoryRow(entry: entry)
                    }
                }
            }
            .overlay {
                if model.isLoading && model.visibleEntries.isEmpty {
                    ProgressView("Chargement historique…")
                } else if let errorMessage = model.errorMessage, model.visibleEntries.isEmpty {
                    ContentUnavailableView("Historique indisponible", systemImage: "wifi.exclamationmark", description: Text(errorMessage))
                } else if model.visibleEntries.isEmpty {
                    ContentUnavailableView.search(text: model.searchText)
                }
            }
            .navigationTitle("Historique")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: String.self) { reference in
                ReferenceDetailScreen(
                    model: ReferenceDetailScreenModel(
                        reference: reference,
                        repository: dependencies.referenceRepository,
                        syncMetadataStore: dependencies.syncMetadataStore
                    )
                )
            }
            .searchable(text: $model.searchText, prompt: "Recherche référence / remarque")
            .safeAreaInset(edge: .top) {
                HistoryHeader(model: model)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        onMenuTap()
                    } label: {
                        Label("Menu", systemImage: "line.3.horizontal")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        ForEach(model.availableFilters, id: \.value) { filter in
                            Button {
                                model.actionFilter = filter.value
                            } label: {
                                if model.actionFilter == filter.value {
                                    Label(filter.label, systemImage: "checkmark")
                                } else {
                                    Text(filter.label)
                                }
                            }
                        }
                    } label: {
                        Label("Type", systemImage: "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .refreshable {
                model.triggerBackgroundRefresh()
            }
        }
        .task {
            await model.load()
        }
    }
}

private struct HistoryHeader: View {
    let model: HistoryScreenModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text("Type : \(model.actionFilterLabel)")
                    .font(.footnote.weight(.semibold))
                Spacer()
            }
            .foregroundStyle(.secondary)

            HStack {
                Text("Dernière sync")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(model.lastSyncAt.map(DateFormatters.syncTimeString(from:)) ?? "Jamais")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.thinMaterial)
    }
}

private struct HistoryRow: View {
    let entry: HistoryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(entry.reference.isEmpty ? "-" : entry.reference)
                    .font(.headline)
                Spacer()
                Text(entry.actionType.label)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Text(entry.afterDisplay.isEmpty ? "-" : entry.afterDisplay)
                .font(.system(.subheadline, design: .monospaced))
            HStack {
                Text(entry.timestampLabel ?? entry.timestampRaw)
                Spacer()
                if !entry.remark.isEmpty {
                    Text(entry.remark)
                        .lineLimit(1)
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
