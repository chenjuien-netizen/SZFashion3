import Foundation

struct ReferenceDetail: Codable, Hashable, Sendable {
    let item: InventoryItem?
    let history: [HistoryEntry]
    let notFoundInStock: Bool
    let lastMovementAt: String?
}
