import SwiftData
import SwiftUI

struct AppView: View {
    @Environment(AppDependencies.self) private var dependencies

    var body: some View {
        TabView {
            InventoryRootView(dependencies: dependencies)
                .tabItem {
                    Label("Inventaire", systemImage: "shippingbox")
                }

            HistoryRootView(dependencies: dependencies)
                .tabItem {
                    Label("Historique", systemImage: "clock.arrow.circlepath")
                }

            TicketsPlaceholderView()
                .tabItem {
                    Label("Tickets", systemImage: "ticket")
                }
        }
    }
}

private struct TicketsPlaceholderView: View {
    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label("Tickets bientôt disponibles", systemImage: "ticket")
            } description: {
                Text("Le backend et les modèles sont prêts. La prochaine étape sera de brancher la liste et le détail des tickets pickup.")
            }
            .navigationTitle("Tickets")
        }
    }
}

#Preview {
    AppView()
        .environment(AppDependencies.preview)
        .modelContainer(previewContainer)
}
