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
        }
    }
}

#Preview {
    AppView()
        .environment(AppDependencies.preview)
        .modelContainer(previewContainer)
}
