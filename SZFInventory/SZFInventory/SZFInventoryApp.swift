//
//  SZFInventoryApp.swift
//  SZFInventory
//
//  Created by Julien CHEN on 22/04/2026.
//

import SwiftData
import SwiftUI

@main
struct SZFInventoryApp: App {
    private let sharedModelContainer: ModelContainer
    @State private var dependencies: AppDependencies

    init() {
        let container = makeModelContainer(inMemory: false)
        sharedModelContainer = container
        _dependencies = State(initialValue: AppDependencies(
            modelContext: ModelContext(container),
            apiClient: APIClient(configuration: .live)
        ))
    }

    var body: some Scene {
        WindowGroup {
            AppView()
                .environment(dependencies)
        }
        .modelContainer(sharedModelContainer)
    }
}
