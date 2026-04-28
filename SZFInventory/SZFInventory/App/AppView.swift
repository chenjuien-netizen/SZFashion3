import SwiftData
import SwiftUI

struct AppView: View {
    @Environment(AppDependencies.self) private var dependencies
    @State private var selectedTab: AppTab = .inventory

    var body: some View {
        TabView(selection: $selectedTab) {
            InventoryRootView(dependencies: dependencies)
                .tag(AppTab.inventory)
                .tabItem {
                    Label("Inventaire", systemImage: "shippingbox")
                }

            HistoryRootView(dependencies: dependencies)
                .tag(AppTab.history)
                .tabItem {
                    Label("Historique", systemImage: "clock.arrow.circlepath")
                }

            TicketsPlaceholderView()
                .tag(AppTab.tickets)
                .tabItem {
                    Label("Tickets", systemImage: "ticket")
                }
        }
        .toolbar(.hidden, for: .tabBar)
        .safeAreaInset(edge: .bottom) {
            BottomTabBar(selectedTab: $selectedTab)
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

struct AppMenuSheet: View {
    var body: some View {
        NavigationStack {
            List {
                Label("Paramètres", systemImage: "gearshape")
                Label("Sync", systemImage: "arrow.triangle.2.circlepath")
                Label("À propos", systemImage: "info.circle")
                Label("Debug", systemImage: "ladybug")
            }
            .navigationTitle("Menu")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium])
    }
}

private struct BottomTabBar: View {
    @Binding var selectedTab: AppTab

    var body: some View {
        HStack(spacing: 4) {
            ForEach(AppTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    VStack(spacing: 3) {
                        Image(systemName: selectedTab == tab ? tab.selectedSystemImage : tab.systemImage)
                            .font(.system(size: 18, weight: .semibold))
                        Text(tab.label)
                            .font(.caption2.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                    .background {
                        if selectedTab == tab {
                            Capsule()
                                .fill(.primary.opacity(0.09))
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.label)
            }
        }
        .padding(6)
        .background(.regularMaterial, in: Capsule())
        .padding(.horizontal, 18)
        .padding(.top, 4)
        .padding(.bottom, 8)
    }
}

struct TicketsPlaceholderView: View {
    @State private var isMenuPresented = false

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
                        isMenuPresented = true
                    } label: {
                        Label("Menu", systemImage: "line.3.horizontal")
                    }
                }
            }
        }
        .sheet(isPresented: $isMenuPresented) {
            AppMenuSheet()
        }
    }
}

#Preview {
    AppView()
        .environment(AppDependencies.preview)
        .modelContainer(previewContainer)
}
