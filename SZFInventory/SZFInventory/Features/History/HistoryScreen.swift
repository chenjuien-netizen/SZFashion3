import SwiftUI

struct HistoryRootView: View {
    @State private var model: HistoryScreenModel

    init(dependencies: AppDependencies) {
        _model = State(initialValue: HistoryScreenModel(repository: dependencies.historyRepository, syncMetadataStore: dependencies.syncMetadataStore))
    }

    @Environment(AppDependencies.self) private var dependencies

    var body: some View {
        NavigationStack {
            List(model.visibleEntries) { entry in
                NavigationLink(value: entry.reference) {
                    HistoryRow(entry: entry)
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
            .refreshable {
                await model.refresh()
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
            Picker("Type", selection: Binding(get: { model.actionFilter }, set: { model.actionFilter = $0 })) {
                ForEach(model.availableFilters, id: \.value) { filter in
                    Text(filter.label).tag(filter.value)
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
