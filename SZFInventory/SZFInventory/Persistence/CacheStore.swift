import Foundation
import SwiftData

@MainActor
final class SyncMetadataStore {
    enum ResourceKey: String {
        case globalSync = "sync"
        case inventory
        case history
        case pickupTickets = "pickup_tickets"
        case detailPrefix = "detail"

        static func detail(reference: String) -> String {
            "detail::\(reference.uppercased())"
        }
    }

    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    func syncDate(for key: String) -> Date? {
        let descriptor = FetchDescriptor<SyncMetadataRecord>(predicate: #Predicate { $0.resourceKey == key })
        return try? modelContext.fetch(descriptor).first?.syncedAt
    }

    func setSyncDate(_ date: Date?, for key: String) {
        let descriptor = FetchDescriptor<SyncMetadataRecord>(predicate: #Predicate { $0.resourceKey == key })
        let record = (try? modelContext.fetch(descriptor).first) ?? SyncMetadataRecord(resourceKey: key, syncedAt: date)
        record.syncedAt = date
        if record.modelContext == nil {
            modelContext.insert(record)
        }
        try? modelContext.save()
    }
}
