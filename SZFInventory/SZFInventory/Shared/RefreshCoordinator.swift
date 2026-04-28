import Observation

@MainActor
@Observable
final class RefreshCoordinator {
    private(set) var activeResource: String?

    var isRefreshing: Bool {
        activeResource != nil
    }

    var activeSyncLabel: String? {
        guard let activeResource else { return nil }

        if activeResource == SyncMetadataStore.ResourceKey.inventory.rawValue {
            return "Sync inventaire en cours…"
        }

        if activeResource == SyncMetadataStore.ResourceKey.history.rawValue {
            return "Sync historique en cours…"
        }

        if activeResource.hasPrefix("detail:") {
            return "Sync fiche en cours…"
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
    }
}
