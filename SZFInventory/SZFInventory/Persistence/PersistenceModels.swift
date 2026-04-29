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
final class PickupTicketRecord {
    @Attribute(.unique) var ticketId: String
    var ticketNumber: String
    var statusRaw: String
    var createdAt: String
    var createdBy: String
    var updatedAt: String?
    var validatedAt: String?
    var validatedBy: String?
    var title: String
    var requestTextRaw: String
    var globalNote: String
    var lineCount: Int
    var resolvedLineCount: Int
    var blockedLineCount: Int
    var clientTicketId: String?
    var version: Int

    init(ticket: PickupTicket) {
        ticketId = ticket.ticketId
        ticketNumber = ticket.ticketNumber
        statusRaw = ticket.status.rawValueForStorage
        createdAt = ticket.createdAt
        createdBy = ticket.createdBy
        updatedAt = ticket.updatedAt
        validatedAt = ticket.validatedAt
        validatedBy = ticket.validatedBy
        title = ticket.title
        requestTextRaw = ticket.requestTextRaw
        globalNote = ticket.globalNote
        lineCount = ticket.lineCount
        resolvedLineCount = ticket.resolvedLineCount
        blockedLineCount = ticket.blockedLineCount
        clientTicketId = ticket.clientTicketId
        version = ticket.version
    }

    var domainModel: PickupTicket {
        PickupTicket(
            ticketId: ticketId,
            ticketNumber: ticketNumber,
            status: PickupTicketStatus(apiValue: statusRaw),
            createdAt: createdAt,
            createdBy: createdBy,
            updatedAt: updatedAt,
            validatedAt: validatedAt,
            validatedBy: validatedBy,
            title: title,
            requestTextRaw: requestTextRaw,
            globalNote: globalNote,
            lineCount: lineCount,
            resolvedLineCount: resolvedLineCount,
            blockedLineCount: blockedLineCount,
            clientTicketId: clientTicketId,
            version: version
        )
    }
}

@Model
final class PickupTicketLineRecord {
    @Attribute(.unique) var lineId: String
    var ticketId: String
    var lineNumber: Int
    var reference: String
    var statusRaw: String
    var requestUnit: String
    var requestQuantity: Double?
    var requestedDisplay: String
    var pickedUnit: String?
    var pickedQuantity: Double?
    var pickedDisplay: String?
    var stockAvailablePiecesSnapshot: Double?
    var stockAvailableDisplaySnapshot: String?
    var warehouseHelpDisplay: String
    var arrivalNoteSnapshot: String
    var lineNote: String
    var stockMutationId: String?
    var createdAt: String
    var updatedAt: String?

    init(line: PickupTicketLine) {
        lineId = line.lineId
        ticketId = line.ticketId
        lineNumber = line.lineNumber
        reference = line.reference
        statusRaw = line.status.rawValueForStorage
        requestUnit = line.requestUnit
        requestQuantity = line.requestQuantity
        requestedDisplay = line.requestedDisplay
        pickedUnit = line.pickedUnit
        pickedQuantity = line.pickedQuantity
        pickedDisplay = line.pickedDisplay
        stockAvailablePiecesSnapshot = line.stockAvailablePiecesSnapshot
        stockAvailableDisplaySnapshot = line.stockAvailableDisplaySnapshot
        warehouseHelpDisplay = line.warehouseHelpDisplay
        arrivalNoteSnapshot = line.arrivalNoteSnapshot
        lineNote = line.lineNote
        stockMutationId = line.stockMutationId
        createdAt = line.createdAt
        updatedAt = line.updatedAt
    }

    var domainModel: PickupTicketLine {
        PickupTicketLine(
            lineId: lineId,
            ticketId: ticketId,
            lineNumber: lineNumber,
            reference: reference,
            status: PickupTicketLineStatus(apiValue: statusRaw),
            requestUnit: requestUnit,
            requestQuantity: requestQuantity,
            requestedDisplay: requestedDisplay,
            pickedUnit: pickedUnit,
            pickedQuantity: pickedQuantity,
            pickedDisplay: pickedDisplay,
            stockAvailablePiecesSnapshot: stockAvailablePiecesSnapshot,
            stockAvailableDisplaySnapshot: stockAvailableDisplaySnapshot,
            warehouseHelpDisplay: warehouseHelpDisplay,
            arrivalNoteSnapshot: arrivalNoteSnapshot,
            lineNote: lineNote,
            stockMutationId: stockMutationId,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

@Model
final class PickupTicketEventRecord {
    @Attribute(.unique) var eventId: String
    var ticketId: String
    var lineId: String?
    var eventType: String
    var actor: String
    var createdAt: String
    var message: String
    var payload: Data?

    init(event: PickupTicketEvent) {
        eventId = event.eventId
        ticketId = event.ticketId
        lineId = event.lineId
        eventType = event.eventType
        actor = event.actor
        createdAt = event.createdAt
        message = event.message
        payload = event.payload
    }

    var domainModel: PickupTicketEvent {
        PickupTicketEvent(
            eventId: eventId,
            ticketId: ticketId,
            lineId: lineId,
            eventType: eventType,
            actor: actor,
            createdAt: createdAt,
            message: message,
            payload: payload
        )
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
        PickupTicketRecord.self,
        PickupTicketLineRecord.self,
        PickupTicketEventRecord.self,
        SyncMetadataRecord.self
    ])
    let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: inMemory)
    return try! ModelContainer(for: schema, configurations: [configuration])
}

let previewContainer: ModelContainer = makeModelContainer(inMemory: true)
