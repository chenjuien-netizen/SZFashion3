import Observation

@MainActor
@Observable
final class RefreshCoordinator {
    private(set) var activeResource: String?

    var isRefreshing: Bool {
        activeResource != nil
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
