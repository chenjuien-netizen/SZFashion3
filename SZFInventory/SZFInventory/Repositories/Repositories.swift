import Foundation

protocol AppSyncRepository: AnyObject {
    func refreshAll() async throws
}

protocol InventoryRepository: AnyObject {
    func loadInventory() async throws -> [InventoryItem]
    func refreshInventory() async throws -> [InventoryItem]
}

protocol HistoryRepository: AnyObject {
    func loadHistory() async throws -> [HistoryEntry]
    func refreshHistory() async throws -> [HistoryEntry]
}

protocol ReferenceRepository: AnyObject {
    func loadDetail(reference: String) async throws -> ReferenceDetail
    func refreshDetail(reference: String) async throws -> ReferenceDetail
}

protocol PickupTicketRepository: AnyObject {
    func loadPickupTickets() async throws -> [PickupTicket]
    func loadPickupTicketDetail(ticketID: String) async throws -> PickupTicketDetail?
    func refreshPickupTickets() async throws -> [PickupTicket]
}
