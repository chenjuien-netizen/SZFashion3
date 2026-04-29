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

                    ForEach(model.visibleSections) { section in
                        HistoryDateHeader(title: section.title)

                        ForEach(section.entries) { entry in
                            if entry.reference.isEmpty {
                                HistoryRow(entry: entry)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                            } else {
                                NavigationLink(value: entry.reference) {
                                    HistoryRow(entry: entry)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                }
                                .buttonStyle(.plain)
                                .contentShape(Rectangle())
                            }
                            Divider()
                        }
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
            Text(model.isSyncInProgress ? model.syncInProgressLabel : DateFormatters.syncLabel(prefix: "Sync", from: model.lastSyncAt))
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
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(entry.reference.isEmpty ? "-" : entry.reference)
                    .font(.subheadline.weight(.bold))
                    .lineLimit(1)
                Spacer()
                HistoryActionBadge(actionType: entry.actionType)
            }

            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    HistoryValueLine(
                        leading: DateFormatters.historyDateTime(timestampRaw: entry.beforeTimestampRaw, fallback: entry.beforeTimestampLabel),
                        value: entry.beforeDisplay,
                        valueStyle: .secondary
                    )
                    HistoryValueLine(
                        leading: "→",
                        value: entry.movementDisplay ?? "",
                        valueStyle: .primary
                    )
                    HistoryValueLine(
                        leading: DateFormatters.historyDateTime(timestampRaw: entry.timestampRaw, fallback: entry.timestampLabel),
                        value: entry.afterDisplay,
                        valueStyle: .accent
                    )
                }

                if !entry.remark.isEmpty {
                    Text(entry.remark)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                        .padding(.leading, 8)
                        .overlay(alignment: .leading) {
                            Rectangle()
                                .fill(.quaternary)
                                .frame(width: 1)
                        }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

private struct HistoryDateHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.caption2.weight(.black))
            .tracking(1.4)
            .textCase(.uppercase)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 5)
            .background(.quaternary)
    }
}

private struct HistoryValueLine: View {
    enum ValueStyle {
        case primary
        case secondary
        case accent
    }

    let leading: String
    let value: String
    let valueStyle: ValueStyle

    var body: some View {
        Grid(horizontalSpacing: 8, verticalSpacing: 0) {
            GridRow(alignment: .firstTextBaseline) {
                Text(leading.isEmpty ? "—" : leading)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: 86, alignment: .leading)
                    .lineLimit(1)
                Text(value.isEmpty ? "-" : value)
                    .font(.system(size: 12, weight: valueStyle == .secondary ? .medium : .semibold, design: .monospaced))
                    .foregroundStyle(color)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var color: Color {
        switch valueStyle {
        case .primary: return .primary
        case .secondary: return .secondary
        case .accent: return .teal
        }
    }
}

private struct HistoryActionBadge: View {
    let actionType: HistoryActionType

    var body: some View {
        Text(actionType.label)
            .font(.system(size: 9, weight: .bold))
            .tracking(0.6)
            .textCase(.uppercase)
            .foregroundStyle(foreground)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(background, in: RoundedRectangle(cornerRadius: 5, style: .continuous))
    }

    private var foreground: Color {
        switch actionType {
        case .exit: return .red
        case .entry: return .green
        case .pickupTicket: return .secondary
        case .adjustment, .other: return .secondary
        }
    }

    private var background: Color {
        switch actionType {
        case .exit: return .red.opacity(0.12)
        case .entry: return .green.opacity(0.12)
        case .pickupTicket: return .secondary.opacity(0.14)
        case .adjustment, .other: return .secondary.opacity(0.12)
        }
    }
}
