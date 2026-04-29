import SwiftData
import SwiftUI

struct AppView: View {
    @Environment(AppDependencies.self) private var dependencies
    @State private var selectedTab: AppTab = .inventory
    @State private var isSideMenuPresented = false
    @State private var isChromeHidden = false
    @State private var isAddReferencePresented = false
    @State private var didTriggerLaunchSync = false

    var body: some View {
        ZStack {
            tabContentStack
                .safeAreaInset(edge: .bottom) {
                    BottomTabBar(selectedTab: $selectedTab)
                        .offset(y: isChromeHidden ? 88 : 0)
                        .opacity(isChromeHidden ? 0 : 1)
                        .animation(.spring(response: 0.28, dampingFraction: 0.9), value: isChromeHidden)
                }

            FloatingAddButton {
                isAddReferencePresented = true
            }
            .offset(y: isChromeHidden ? 96 : 0)
            .opacity(isChromeHidden ? 0 : 1)
            .animation(.spring(response: 0.28, dampingFraction: 0.9), value: isChromeHidden)

            SideMenuOverlay(isPresented: $isSideMenuPresented)
        }
        .simultaneousGesture(edgeMenuGesture)
        .sheet(isPresented: $isAddReferencePresented) {
            AddReferencePlaceholderView()
        }
        .task {
            triggerLaunchSyncIfNeeded()
        }
        .tint(.primary)
    }

    private var tabContentStack: some View {
        ZStack {
            InventoryRootView(dependencies: dependencies, onMenuTap: showSideMenu, onChromeVisibilityChange: setChromeHidden)
                .opacity(selectedTab == .inventory ? 1 : 0)
                .allowsHitTesting(selectedTab == .inventory)

            HistoryRootView(dependencies: dependencies, onMenuTap: showSideMenu, onChromeVisibilityChange: setChromeHidden)
                .opacity(selectedTab == .history ? 1 : 0)
                .allowsHitTesting(selectedTab == .history)

            TicketsRootView(dependencies: dependencies, onMenuTap: showSideMenu, onChromeVisibilityChange: setChromeHidden)
                .opacity(selectedTab == .tickets ? 1 : 0)
                .allowsHitTesting(selectedTab == .tickets)
        }
    }

    private func showSideMenu() {
        withAnimation(.spring(response: 0.32, dampingFraction: 0.88)) {
            isSideMenuPresented = true
        }
    }

    private func triggerLaunchSyncIfNeeded() {
        guard !didTriggerLaunchSync, !dependencies.refreshCoordinator.isRefreshing else { return }
        didTriggerLaunchSync = true
        Task {
            let resource = RefreshCoordinator.globalSyncResource
            guard dependencies.refreshCoordinator.begin(resource) else { return }
            defer {
                dependencies.refreshCoordinator.end(resource)
            }
            do {
                try await dependencies.appSyncRepository.refreshAll()
            } catch {
                // Screens keep showing their cached data; explicit errors stay screen-local.
            }
        }
    }

    private func setChromeHidden(_ hidden: Bool) {
        guard isChromeHidden != hidden else { return }
        withAnimation(.spring(response: 0.28, dampingFraction: 0.9)) {
            isChromeHidden = hidden
        }
    }

    private var edgeMenuGesture: some Gesture {
        DragGesture(minimumDistance: 24, coordinateSpace: .global)
            .onEnded { value in
                guard value.startLocation.x < 24, value.translation.width > 70, abs(value.translation.height) < 60 else { return }
                showSideMenu()
            }
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case inventory
    case history
    case tickets

    var id: String { rawValue }

    var label: String {
        switch self {
        case .inventory: return "Inventaire"
        case .history: return "Historique"
        case .tickets: return "Tickets"
        }
    }

    var systemImage: String {
        switch self {
        case .inventory: return "shippingbox"
        case .history: return "clock.arrow.circlepath"
        case .tickets: return "ticket"
        }
    }

    var selectedSystemImage: String {
        switch self {
        case .inventory: return "shippingbox.fill"
        case .history: return "clock.arrow.circlepath"
        case .tickets: return "ticket.fill"
        }
    }
}

private struct SideMenuOverlay: View {
    @Binding var isPresented: Bool

    var body: some View {
        ZStack(alignment: .leading) {
            if isPresented {
                Color.black.opacity(0.28)
                    .ignoresSafeArea()
                    .onTapGesture {
                        hide()
                    }
                    .transition(.opacity)

                SideMenuPanel()
                    .frame(width: 300)
                    .frame(maxHeight: .infinity)
                    .gesture(
                        DragGesture(minimumDistance: 20)
                            .onEnded { value in
                                guard value.translation.width < -60 else { return }
                                hide()
                            }
                    )
                    .transition(.move(edge: .leading))
            }
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.88), value: isPresented)
        .allowsHitTesting(isPresented)
    }

    private func hide() {
        withAnimation(.spring(response: 0.32, dampingFraction: 0.88)) {
            isPresented = false
        }
    }
}

private struct SideMenuPanel: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 6) {
                Circle()
                    .fill(.primary)
                    .frame(width: 46, height: 46)
                    .overlay {
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(.background)
                    }
                Text("SZF Inventory")
                    .font(.title3.weight(.bold))
                Text("Menu bientôt disponible")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 18) {
                SideMenuRow(title: "Paramètres", systemImage: "gearshape")
                SideMenuRow(title: "Sync", systemImage: "arrow.triangle.2.circlepath")
                SideMenuRow(title: "À propos", systemImage: "info.circle")
                SideMenuRow(title: "Debug", systemImage: "ladybug")
            }

            Spacer()
        }
        .padding(.top, 64)
        .padding(.horizontal, 22)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(.background)
        .ignoresSafeArea()
    }
}

private struct SideMenuRow: View {
    let title: String
    let systemImage: String

    var body: some View {
        Label(title, systemImage: systemImage)
            .font(.headline)
            .foregroundStyle(.primary)
    }
}

private struct BottomTabBar: View {
    @Binding var selectedTab: AppTab

    var body: some View {
        VStack(spacing: 0) {
            Divider()

            HStack(spacing: 0) {
                ForEach(AppTab.allCases) { tab in
                    Button {
                        selectedTab = tab
                    } label: {
                        VStack(spacing: 1) {
                            Image(systemName: selectedTab == tab ? tab.selectedSystemImage : tab.systemImage)
                                .font(.system(size: 18, weight: .semibold))
                            Text(tab.label)
                                .font(.system(size: 9, weight: selectedTab == tab ? .bold : .semibold))
                        }
                        .overlay(alignment: .top) {
                            Capsule()
                                .fill(selectedTab == tab ? Color.primary : Color.clear)
                                .frame(width: 18, height: 2)
                                .offset(y: -6)
                        }
                        .frame(maxWidth: .infinity, minHeight: 42, maxHeight: 42)
                        .contentShape(Rectangle())
                        .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(tab.label)
                }
            }
        }
        .background(.background)
    }
}

struct AppTopBar<Trailing: View>: View {
    let title: String
    let onMenuTap: () -> Void
    @ViewBuilder let trailing: () -> Trailing

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onMenuTap) {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 18, weight: .semibold))
                    .frame(width: 34, height: 34)
                    .foregroundStyle(.primary)
            }
            .buttonStyle(.plain)

            Text(title)
                .font(.headline.weight(.semibold))
                .lineLimit(1)

            Spacer()

            trailing()
                .foregroundStyle(.primary)
        }
        .padding(.horizontal, 14)
        .frame(height: 42)
        .background(.background)
        .overlay(alignment: .bottom) {
            Divider()
        }
    }
}

struct ChromeSearchField: View {
    let prompt: String
    @Binding var text: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField(prompt, text: $text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        }
        .font(.subheadline)
        .padding(.horizontal, 12)
        .frame(height: 34)
        .background(.quaternary, in: Capsule())
        .padding(.horizontal, 14)
        .padding(.vertical, 5)
        .background(.background)
    }
}

struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

private struct FloatingAddButton: View {
    let action: () -> Void

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Button(action: action) {
                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 52, height: 52)
                        .background(.primary, in: Circle())
                        .shadow(color: .black.opacity(0.22), radius: 12, x: 0, y: 6)
                }
                .buttonStyle(.plain)
                .padding(.trailing, 18)
                .padding(.bottom, 62)
            }
        }
    }
}

private struct AddReferencePlaceholderView: View {
    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label("Ajouter une référence", systemImage: "plus.circle")
            } description: {
                Text("Ajout de référence bientôt disponible.")
            }
            .navigationTitle("Ajouter")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium])
    }
}

#Preview {
    AppView()
        .environment(AppDependencies.preview)
        .modelContainer(previewContainer)
}
