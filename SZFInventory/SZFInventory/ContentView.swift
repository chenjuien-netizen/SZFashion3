import SwiftData
import SwiftUI

struct ContentView: View {
    var body: some View {
        AppView()
    }
}

#Preview {
    ContentView()
        .environment(AppDependencies.preview)
        .modelContainer(previewContainer)
}
