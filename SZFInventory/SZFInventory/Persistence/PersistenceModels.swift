import Foundation
import SwiftData

@Model
final class InventoryItemRecord {
    @Attribute(.unique) var id: String
    var reference: String
    var sortKey: String?
    var tail: Int
    var unitsPerBox: Int
    var boxes: Int
    var sign: String
    var fractionText: String
    var colisage: Double
    var packNotation: String
    var warehouse: String
    var remark: String
    var arrivalNote: String
    var createdAtRaw: String?
    var arrivalUpdatedAtRaw: String?
    var stockDisplay: String
    var stockStateRaw: String
    var completionStatusRaw: String

    init(item: InventoryItem) {
        id = item.id
        reference = item.reference
        sortKey = item.sortKey
        tail = item.tail
        unitsPerBox = item.unitsPerBox
        boxes = item.boxes
        sign = item.sign
        fractionText = item.fractionText
        colisage = item.colisage
        packNotation = item.packNotation
        warehouse = item.warehouse
        remark = item.remark
        arrivalNote = item.arrivalNote
        createdAtRaw = item.createdAtRaw
        arrivalUpdatedAtRaw = item.arrivalUpdatedAtRaw
        stockDisplay = item.stockDisplay
        stockStateRaw = item.stockState.rawValue
        completionStatusRaw = item.completionStatus.rawValue
    }

    func update(from item: InventoryItem) {
        reference = item.reference
        sortKey = item.sortKey
        tail = item.tail
        unitsPerBox = item.unitsPerBox
        boxes = item.boxes
        sign = item.sign
        fractionText = item.fractionText
        colisage = item.colisage
        packNotation = item.packNotation
        warehouse = item.warehouse
        remark = item.remark
        arrivalNote = item.arrivalNote
        createdAtRaw = item.createdAtRaw
        arrivalUpdatedAtRaw = item.arrivalUpdatedAtRaw
        stockDisplay = item.stockDisplay
        stockStateRaw = item.stockState.rawValue
        completionStatusRaw = item.completionStatus.rawValue
    }

    var domainModel: InventoryItem {
        InventoryItem(
            id: id,
            reference: reference,
            sortKey: sortKey,
            tail: tail,
            unitsPerBox: unitsPerBox,
            boxes: boxes,
            sign: sign,
            fractionText: fractionText,
            colisage: colisage,
            packNotation: packNotation,
            warehouse: warehouse,
            remark: remark,
            arrivalNote: arrivalNote,
            createdAtRaw: createdAtRaw,
            arrivalUpdatedAtRaw: arrivalUpdatedAtRaw,
            stockDisplay: stockDisplay,
            stockState: InventoryStockState(rawValue: stockStateRaw) ?? .outOfStock,
            completionStatus: CompletionStatus(rawValue: completionStatusRaw) ?? .incomplete
        )
    }
}

@Model
final class HistoryEntryRecord {
    @Attribute(.unique) var id: String
    var timestampRaw: String
    var timestampLabel: String?
    var actionTypeRaw: String
    var reference: String
    var rowId: String?
    var beforeDisplay: String
    var afterDisplay: String
    var remark: String
    var source: String
    var beforeTotalPieces: Int?
    var afterTotalPieces: Int?
    var beforeTimestampRaw: String?
    var beforeTimestampLabel: String?
    var movementDisplay: String?
    var businessId: String?
    var businessLineId: String?

    init(entry: HistoryEntry) {
        id = entry.id
        timestampRaw = entry.timestampRaw
        timestampLabel = entry.timestampLabel
        actionTypeRaw = entry.actionType.rawValueForFilter
        reference = entry.reference
        rowId = entry.rowId
        beforeDisplay = entry.beforeDisplay
        afterDisplay = entry.afterDisplay
        remark = entry.remark
        source = entry.source
        beforeTotalPieces = entry.beforeTotalPieces
        afterTotalPieces = entry.afterTotalPieces
        beforeTimestampRaw = entry.beforeTimestampRaw
        beforeTimestampLabel = entry.beforeTimestampLabel
        movementDisplay = entry.movementDisplay
        businessId = entry.businessId
        businessLineId = entry.businessLineId
    }

    func update(from entry: HistoryEntry) {
        timestampRaw = entry.timestampRaw
        timestampLabel = entry.timestampLabel
        actionTypeRaw = entry.actionType.rawValueForFilter
        reference = entry.reference
        rowId = entry.rowId
        beforeDisplay = entry.beforeDisplay
        afterDisplay = entry.afterDisplay
        remark = entry.remark
        source = entry.source
        beforeTotalPieces = entry.beforeTotalPieces
        afterTotalPieces = entry.afterTotalPieces
        beforeTimestampRaw = entry.beforeTimestampRaw
        beforeTimestampLabel = entry.beforeTimestampLabel
        movementDisplay = entry.movementDisplay
        businessId = entry.businessId
        businessLineId = entry.businessLineId
    }

    var domainModel: HistoryEntry {
        HistoryEntry(
            id: id,
            timestampRaw: timestampRaw,
            timestampLabel: timestampLabel,
            actionType: HistoryActionType(apiValue: actionTypeRaw),
            reference: reference,
            rowId: rowId,
            beforeDisplay: beforeDisplay,
            afterDisplay: afterDisplay,
            remark: remark,
            source: source,
            beforeTotalPieces: beforeTotalPieces,
            afterTotalPieces: afterTotalPieces,
            beforeTimestampRaw: beforeTimestampRaw,
            beforeTimestampLabel: beforeTimestampLabel,
            movementDisplay: movementDisplay,
            businessId: businessId,
            businessLineId: businessLineId
        )
    }
}

@Model
final class ReferenceDetailCacheRecord {
    @Attribute(.unique) var reference: String
    var itemData: Data?
    var historyData: Data
    var notFoundInStock: Bool
    var lastMovementAt: String?
    var syncedAt: Date

    init(reference: String, itemData: Data?, historyData: Data, notFoundInStock: Bool, lastMovementAt: String?, syncedAt: Date) {
        self.reference = reference
        self.itemData = itemData
        self.historyData = historyData
        self.notFoundInStock = notFoundInStock
        self.lastMovementAt = lastMovementAt
        self.syncedAt = syncedAt
    }
}

@Model
final class SyncMetadataRecord {
    @Attribute(.unique) var resourceKey: String
    var syncedAt: Date?

    init(resourceKey: String, syncedAt: Date?) {
        self.resourceKey = resourceKey
        self.syncedAt = syncedAt
    }
}

func makeModelContainer(inMemory: Bool) -> ModelContainer {
    let schema = Schema([
        InventoryItemRecord.self,
        HistoryEntryRecord.self,
        ReferenceDetailCacheRecord.self,
        SyncMetadataRecord.self
    ])
    let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: inMemory)
    return try! ModelContainer(for: schema, configurations: [configuration])
}

let previewContainer: ModelContainer = makeModelContainer(inMemory: true)
