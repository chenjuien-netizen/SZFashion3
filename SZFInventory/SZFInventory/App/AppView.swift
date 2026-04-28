import SwiftData
import SwiftUI

struct AppView: View {
    @Environment(AppDependencies.self) private var dependencies
    @State private var selectedTab: AppTab = .inventory
    @State private var isSideMenuPresented = false

    var body: some View {
        ZStack {
            currentTabContent
                .safeAreaInset(edge: .bottom) {
                    BottomTabBar(selectedTab: $selectedTab)
                }

            SideMenuOverlay(isPresented: $isSideMenuPresented)
        }
    }

    @ViewBuilder
    private var currentTabContent: some View {
        switch selectedTab {
        case .inventory:
            InventoryRootView(dependencies: dependencies, onMenuTap: showSideMenu)
        case .history:
            HistoryRootView(dependencies: dependencies, onMenuTap: showSideMenu)
        case .tickets:
            TicketsPlaceholderView(onMenuTap: showSideMenu)
        }
    }

    private func showSideMenu() {
        withAnimation(.spring(response: 0.32, dampingFraction: 0.88)) {
            isSideMenuPresented = true
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
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 34, weight: .semibold))
                    .foregroundStyle(.primary)
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
        .background(.regularMaterial)
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
                        VStack(spacing: 4) {
                            Image(systemName: selectedTab == tab ? tab.selectedSystemImage : tab.systemImage)
                                .font(.system(size: 20, weight: .semibold))
                            Text(tab.label)
                                .font(.caption2.weight(selectedTab == tab ? .bold : .semibold))
                        }
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .contentShape(Rectangle())
                        .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(tab.label)
                }
            }
            .padding(.top, 5)
            .padding(.bottom, 3)
        }
        .background(.bar)
    }
}

struct TicketsPlaceholderView: View {
    let onMenuTap: () -> Void

    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label("Tickets bientôt disponibles", systemImage: "ticket")
            } description: {
                Text("Le backend et les modèles sont prêts. La prochaine étape sera de brancher la liste et le détail des tickets pickup.")
            }
            .navigationTitle("Tickets")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        onMenuTap()
                    } label: {
                        Label("Menu", systemImage: "line.3.horizontal")
                    }
                }
            }
        }
    }
}

#Preview {
    AppView()
        .environment(AppDependencies.preview)
        .modelContainer(previewContainer)
}
