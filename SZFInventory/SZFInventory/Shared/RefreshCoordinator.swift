import Foundation
import Observation

@MainActor
@Observable
final class RefreshCoordinator {
    static let globalSyncResource = "sync"

    private(set) var activeResource: String?
    private(set) var lastCompletedAt: Date?

    var isRefreshing: Bool {
        activeResource != nil
    }

    var activeSyncLabel: String? {
        guard let activeResource else { return nil }

        if activeResource == Self.globalSyncResource {
            return "Sync globale en cours…"
        }

        return "Sync en cours…"
    }

    func begin(_ resource: String) -> Bool {
        guard activeResource == nil else { return false }
        activeResource = resource
        return true
    }

    func end(_ resource: String) {
        guard activeResource == resource else { return }
        activeResource = nil
        lastCompletedAt = Date()
    }
}
