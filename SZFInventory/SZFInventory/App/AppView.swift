import SwiftData
import SwiftUI

struct AppView: View {
    @Environment(AppDependencies.self) private var dependencies
    @State private var selectedTab: AppTab = .inventory
    @State private var isSideMenuPresented = false
    @State private var isChromeHidden = false
    @State private var isAddReferencePresented = false

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

            TicketsPlaceholderView(onMenuTap: showSideMenu, onChromeVisibilityChange: setChromeHidden)
                .opacity(selectedTab == .tickets ? 1 : 0)
                .allowsHitTesting(selectedTab == .tickets)
        }
    }

    private func showSideMenu() {
        withAnimation(.spring(response: 0.32, dampingFraction: 0.88)) {
            isSideMenuPresented = true
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
                        VStack(spacing: 2) {
                            Image(systemName: selectedTab == tab ? tab.selectedSystemImage : tab.systemImage)
                                .font(.system(size: 19, weight: .semibold))
                            Text(tab.label)
                                .font(.system(size: 10, weight: selectedTab == tab ? .bold : .semibold))
                        }
                        .frame(maxWidth: .infinity, minHeight: 46, maxHeight: 46)
                        .contentShape(Rectangle())
                        .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(tab.label)
                }
            }
        }
        .background(.bar)
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
                    .frame(width: 36, height: 36)
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
        .frame(height: 44)
        .background(.bar)
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
        .frame(height: 36)
        .background(.quaternary, in: Capsule())
        .padding(.horizontal, 14)
        .padding(.vertical, 6)
        .background(.bar)
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
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 56, height: 56)
                        .background(.primary, in: Circle())
                        .shadow(color: .black.opacity(0.22), radius: 12, x: 0, y: 6)
                }
                .buttonStyle(.plain)
                .padding(.trailing, 18)
                .padding(.bottom, 68)
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

struct TicketsPlaceholderView: View {
    let onMenuTap: () -> Void
    let onChromeVisibilityChange: (Bool) -> Void

    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label("Tickets bientôt disponibles", systemImage: "ticket")
            } description: {
                Text("Le backend et les modèles sont prêts. La prochaine étape sera de brancher la liste et le détail des tickets pickup.")
            }
        }
        .safeAreaInset(edge: .top) {
            AppTopBar(title: "Tickets", onMenuTap: onMenuTap) {
                EmptyView()
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            onChromeVisibilityChange(false)
        }
    }
}

#Preview {
    AppView()
        .environment(AppDependencies.preview)
        .modelContainer(previewContainer)
}
