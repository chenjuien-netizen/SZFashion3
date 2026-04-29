import Observation
import SwiftUI

@MainActor
@Observable
final class TicketsScreenModel {
    private let repository: PickupTicketRepository
    private let appSyncRepository: AppSyncRepository
    private let syncMetadataStore: SyncMetadataStore
    private let refreshCoordinator: RefreshCoordinator

    var tickets: [PickupTicket] = []
    var searchText = ""
    var isLoading = false
    var isRefreshing = false
    var errorMessage: String?
    var lastSyncAt: Date?
    private var hasLoaded = false
    private var refreshTask: Task<Void, Never>?

    init(repository: PickupTicketRepository, appSyncRepository: AppSyncRepository, syncMetadataStore: SyncMetadataStore, refreshCoordinator: RefreshCoordinator) {
        self.repository = repository
        self.appSyncRepository = appSyncRepository
        self.syncMetadataStore = syncMetadataStore
        self.refreshCoordinator = refreshCoordinator
    }

    var visibleTickets: [PickupTicket] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return tickets }
        return tickets.filter { ticket in
            [ticket.ticketNumber, ticket.title, ticket.status.label, ticket.requestTextRaw, ticket.globalNote]
                .joined(separator: " ")
                .lowercased()
                .contains(query)
        }
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
        defer { isLoading = false }
        do {
            tickets = try await repository.loadPickupTickets()
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.pickupTickets.rawValue)
            hasLoaded = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func reloadFromCache() async {
        do {
            tickets = try await repository.loadPickupTickets()
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.pickupTickets.rawValue)
        } catch {
            if tickets.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
    }

    func triggerBackgroundRefresh() {
        guard !isRefreshing, refreshTask == nil, !refreshCoordinator.isRefreshing else { return }
        refreshTask = Task { [weak self] in
            guard let self else { return }
            defer { self.refreshTask = nil }
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
            if tickets.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
    }
}

struct TicketsRootView: View {
    @Environment(AppDependencies.self) private var dependencies
    @State private var model: TicketsScreenModel
    @State private var isChromeHidden = false
    @State private var lastScrollOffset: CGFloat = 0
    let onMenuTap: () -> Void
    let onChromeVisibilityChange: (Bool) -> Void

    init(
        dependencies: AppDependencies,
        onMenuTap: @escaping () -> Void = {},
        onChromeVisibilityChange: @escaping (Bool) -> Void = { _ in }
    ) {
        _model = State(initialValue: TicketsScreenModel(repository: dependencies.pickupTicketRepository, appSyncRepository: dependencies.appSyncRepository, syncMetadataStore: dependencies.syncMetadataStore, refreshCoordinator: dependencies.refreshCoordinator))
        self.onMenuTap = onMenuTap
        self.onChromeVisibilityChange = onChromeVisibilityChange
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                GeometryReader { proxy in
                    Color.clear
                        .preference(key: ScrollOffsetPreferenceKey.self, value: proxy.frame(in: .named("tickets-scroll")).minY)
                }
                .frame(height: 0)

                LazyVStack(spacing: 0) {
                    TicketsStatusRow(model: model)
                    ForEach(model.visibleTickets) { ticket in
                        NavigationLink(value: ticket.ticketId) {
                            TicketRow(ticket: ticket)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                        }
                        .buttonStyle(.plain)
                        Divider()
                    }
                }
            }
            .coordinateSpace(name: "tickets-scroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self, perform: updateChromeVisibility)
            .overlay {
                if (model.isLoading || model.isSyncInProgress) && model.visibleTickets.isEmpty {
                    ProgressView("Chargement tickets…")
                } else if let errorMessage = model.errorMessage, model.visibleTickets.isEmpty {
                    ContentUnavailableView("Tickets indisponibles", systemImage: "wifi.exclamationmark", description: Text(errorMessage))
                } else if model.visibleTickets.isEmpty {
                    ContentUnavailableView("Aucun ticket", systemImage: "ticket", description: Text("Lance une sync globale pour récupérer les tickets pickup."))
                }
            }
            .navigationTitle("Tickets")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: String.self) { ticketId in
                PickupTicketDetailScreen(
                    model: PickupTicketDetailScreenModel(
                        ticketID: ticketId,
                        repository: dependencies.pickupTicketRepository,
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
                        AppTopBar(title: "Tickets", onMenuTap: onMenuTap) {
                            EmptyView()
                        }
                        ChromeSearchField(prompt: "Recherche ticket / statut / note", text: $model.searchText)
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

private struct TicketsStatusRow: View {
    let model: TicketsScreenModel

    var body: some View {
        HStack(spacing: 8) {
            Text("\(model.visibleTickets.count) tickets")
            Spacer(minLength: 8)
            Text(model.isSyncInProgress ? model.syncInProgressLabel : DateFormatters.syncLabel(prefix: "Sync", from: model.lastSyncAt))
        }
        .font(.caption.weight(.medium))
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .padding(.horizontal, 14)
        .padding(.vertical, 5)
        .accessibilityElement(children: .combine)
    }
}

private struct TicketRow: View {
    let ticket: PickupTicket

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(ticket.ticketNumber.isEmpty ? ticket.ticketId : ticket.ticketNumber)
                    .font(.subheadline.weight(.bold))
                    .lineLimit(1)
                Spacer(minLength: 8)
                TicketStatusBadge(status: ticket.status)
            }

            if !ticket.title.isEmpty {
                Text(ticket.title)
                    .font(.subheadline)
                    .lineLimit(2)
            } else if !ticket.requestTextRaw.isEmpty {
                Text(ticket.requestTextRaw)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack(spacing: 10) {
                Label("\(ticket.lineCount) lignes", systemImage: "list.bullet")
                Label("\(ticket.resolvedLineCount) ok", systemImage: "checkmark.circle")
                if ticket.blockedLineCount > 0 {
                    Label("\(ticket.blockedLineCount) bloquées", systemImage: "exclamationmark.triangle")
                }
                Spacer(minLength: 0)
                Text(DateFormatters.historyDateTime(timestampRaw: ticket.updatedAt ?? ticket.createdAt, fallback: nil))
            }
            .font(.caption2.weight(.medium))
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
        .contentShape(Rectangle())
    }
}

private struct TicketStatusBadge: View {
    let status: PickupTicketStatus

    var body: some View {
        Text(status.label)
            .font(.system(size: 9, weight: .bold))
            .tracking(0.6)
            .textCase(.uppercase)
            .foregroundStyle(foreground)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(background, in: RoundedRectangle(cornerRadius: 5, style: .continuous))
    }

    private var foreground: Color {
        switch status {
        case .validated: return .green
        case .cancelled: return .red
        case .inProgress: return .orange
        case .draft, .other: return .secondary
        }
    }

    private var background: Color {
        foreground.opacity(0.12)
    }
}

@MainActor
@Observable
final class PickupTicketDetailScreenModel {
    private let repository: PickupTicketRepository
    private let appSyncRepository: AppSyncRepository
    private let syncMetadataStore: SyncMetadataStore
    private let refreshCoordinator: RefreshCoordinator

    let ticketID: String
    var detail: PickupTicketDetail?
    var isLoading = false
    var isRefreshing = false
    var errorMessage: String?
    var lastSyncAt: Date?
    private var refreshTask: Task<Void, Never>?

    init(ticketID: String, repository: PickupTicketRepository, appSyncRepository: AppSyncRepository, syncMetadataStore: SyncMetadataStore, refreshCoordinator: RefreshCoordinator) {
        self.ticketID = ticketID
        self.repository = repository
        self.appSyncRepository = appSyncRepository
        self.syncMetadataStore = syncMetadataStore
        self.refreshCoordinator = refreshCoordinator
    }

    var isSyncInProgress: Bool {
        isRefreshing || refreshCoordinator.isRefreshing
    }

    var syncInProgressLabel: String {
        refreshCoordinator.activeSyncLabel ?? "Sync en cours…"
    }

    var syncCompletedAt: Date? {
        refreshCoordinator.lastCompletedAt
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        await reloadFromCache()
    }

    func reloadFromCache() async {
        do {
            detail = try await repository.loadPickupTicketDetail(ticketID: ticketID)
            lastSyncAt = syncMetadataStore.syncDate(for: SyncMetadataStore.ResourceKey.pickupTickets.rawValue)
        } catch {
            if detail == nil {
                errorMessage = error.localizedDescription
            }
        }
    }

    func triggerBackgroundRefresh() {
        guard !isRefreshing, refreshTask == nil, !refreshCoordinator.isRefreshing else { return }
        refreshTask = Task { [weak self] in
            guard let self else { return }
            defer { self.refreshTask = nil }
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
            if detail == nil {
                errorMessage = error.localizedDescription
            }
        }
    }
}

struct PickupTicketDetailScreen: View {
    @State var model: PickupTicketDetailScreenModel

    var body: some View {
        List {
            if let detail = model.detail {
                Section("Ticket") {
                    detailRow("Numéro", detail.ticket.ticketNumber.isEmpty ? detail.ticket.ticketId : detail.ticket.ticketNumber)
                    detailRow("Statut", detail.ticket.status.label)
                    detailRow("Créé", DateFormatters.historyDateTime(timestampRaw: detail.ticket.createdAt, fallback: nil))
                    detailRow("Créé par", detail.ticket.createdBy.isEmpty ? "-" : detail.ticket.createdBy)
                    if !detail.ticket.globalNote.isEmpty {
                        detailRow("Note", detail.ticket.globalNote)
                    }
                }

                Section("Lignes") {
                    if detail.lines.isEmpty {
                        Text("Aucune ligne")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(detail.lines) { line in
                            TicketLineRow(line: line)
                        }
                    }
                }

                Section("Événements") {
                    if detail.events.isEmpty {
                        Text("Aucun événement")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(detail.events) { event in
                            TicketEventRow(event: event)
                        }
                    }
                }

                Section {
                    detailRow("Dernière sync", model.isSyncInProgress ? model.syncInProgressLabel : DateFormatters.syncLabel(prefix: "Sync", from: model.lastSyncAt))
                }
            }
        }
        .navigationTitle(model.detail?.ticket.ticketNumber.isEmpty == false ? model.detail!.ticket.ticketNumber : "Ticket")
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if model.isLoading && model.detail == nil {
                ProgressView("Chargement ticket…")
            } else if let errorMessage = model.errorMessage, model.detail == nil {
                ContentUnavailableView("Ticket indisponible", systemImage: "ticket", description: Text(errorMessage))
            } else if model.detail == nil {
                ContentUnavailableView("Ticket absent du cache", systemImage: "ticket", description: Text("Lance une sync globale puis réessaie."))
            }
        }
        .refreshable {
            model.triggerBackgroundRefresh()
        }
        .task {
            await model.load()
        }
        .task(id: model.syncCompletedAt) {
            guard model.syncCompletedAt != nil else { return }
            await model.reloadFromCache()
        }
    }

    @ViewBuilder
    private func detailRow(_ title: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .foregroundStyle(.secondary)
            Spacer(minLength: 12)
            Text(value.isEmpty ? "-" : value)
                .multilineTextAlignment(.trailing)
        }
    }
}

private struct TicketLineRow: View {
    let line: PickupTicketLine

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .firstTextBaseline) {
                Text(line.reference.isEmpty ? "Référence inconnue" : line.reference)
                    .font(.subheadline.weight(.bold))
                Spacer()
                Text(line.status.label)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 8) {
                Text(line.requestedDisplay.isEmpty ? "-" : line.requestedDisplay)
                if let pickedDisplay = line.pickedDisplay, !pickedDisplay.isEmpty {
                    Text("→")
                    Text(pickedDisplay)
                        .foregroundStyle(.teal)
                }
            }
            .font(.system(.caption, design: .monospaced))
            if !line.warehouseHelpDisplay.isEmpty || !line.arrivalNoteSnapshot.isEmpty {
                Text([line.warehouseHelpDisplay, line.arrivalNoteSnapshot].filter { !$0.isEmpty }.joined(separator: " · "))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            if !line.lineNote.isEmpty {
                Text(line.lineNote)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 3)
    }
}

private struct TicketEventRow: View {
    let event: PickupTicketEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(event.eventType.isEmpty ? "Événement" : event.eventType)
                    .font(.caption.weight(.semibold))
                Spacer()
                Text(DateFormatters.historyDateTime(timestampRaw: event.createdAt, fallback: nil))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            if !event.message.isEmpty {
                Text(event.message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 3)
    }
}
