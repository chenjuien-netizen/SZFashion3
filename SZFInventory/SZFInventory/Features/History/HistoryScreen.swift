import SwiftUI

struct HistoryRootView: View {
    @State private var model: HistoryScreenModel
    @State private var isChromeHidden = false
    @State private var lastScrollOffset: CGFloat = 0
    let onMenuTap: () -> Void
    let onChromeVisibilityChange: (Bool) -> Void

    init(
        dependencies: AppDependencies,
        onMenuTap: @escaping () -> Void = {},
        onChromeVisibilityChange: @escaping (Bool) -> Void = { _ in }
    ) {
        _model = State(initialValue: HistoryScreenModel(repository: dependencies.historyRepository, appSyncRepository: dependencies.appSyncRepository, syncMetadataStore: dependencies.syncMetadataStore, refreshCoordinator: dependencies.refreshCoordinator))
        self.onMenuTap = onMenuTap
        self.onChromeVisibilityChange = onChromeVisibilityChange
    }

    @Environment(AppDependencies.self) private var dependencies

    var body: some View {
        NavigationStack {
            ScrollView {
                GeometryReader { proxy in
                    Color.clear
                        .preference(key: ScrollOffsetPreferenceKey.self, value: proxy.frame(in: .named("history-scroll")).minY)
                }
                .frame(height: 0)

                LazyVStack(spacing: 0) {
                    HistoryStatusRow(model: model)

                    ForEach(model.visibleEntries) { entry in
                        if entry.reference.isEmpty {
                            HistoryRow(entry: entry)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                        } else {
                            NavigationLink(value: entry.reference) {
                                HistoryRow(entry: entry)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                            }
                            .buttonStyle(.plain)
                            .contentShape(Rectangle())
                        }
                        Divider()
                    }
                }
            }
            .coordinateSpace(name: "history-scroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self, perform: updateChromeVisibility)
            .overlay {
                if (model.isLoading || model.isSyncInProgress) && model.visibleEntries.isEmpty {
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
                        appSyncRepository: dependencies.appSyncRepository,
                        syncMetadataStore: dependencies.syncMetadataStore,
                        refreshCoordinator: dependencies.refreshCoordinator
                    )
                )
            }
            .toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .top) {
                if !isChromeHidden {
                    VStack(spacing: 0) {
                        AppTopBar(title: "Historique", onMenuTap: onMenuTap) {
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
                            .buttonStyle(.plain)
                        }

                        ChromeSearchField(prompt: "Recherche référence / remarque", text: $model.searchText)
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
            .refreshable {
                model.triggerBackgroundRefresh()
            }
        }
        .task {
            await model.load()
        }
        .task(id: dependencies.refreshCoordinator.lastCompletedAt) {
            guard dependencies.refreshCoordinator.lastCompletedAt != nil else { return }
            await model.reloadFromCache()
        }
    }

    private func updateChromeVisibility(_ offset: CGFloat) {
        let delta = offset - lastScrollOffset
        lastScrollOffset = offset

        guard abs(delta) > 8 else { return }
        let shouldHide = delta < 0 && offset < -24
        if shouldHide != isChromeHidden {
            isChromeHidden = shouldHide
            onChromeVisibilityChange(shouldHide)
        }
    }
}

private struct HistoryStatusRow: View {
    let model: HistoryScreenModel

    var body: some View {
        HStack(spacing: 8) {
            Text("Type : \(model.actionFilterLabel)")
            Spacer(minLength: 8)
            Text(model.isSyncInProgress ? model.syncInProgressLabel : (model.lastSyncAt.map(DateFormatters.syncTimeString(from:)) ?? "Jamais"))
        }
        .font(.caption.weight(.medium))
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 2, trailing: 16))
        .padding(.horizontal, 16)
        .padding(.vertical, 5)
        .accessibilityElement(children: .combine)
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
