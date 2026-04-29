import Foundation

extension InventoryItem {
    init(
        id: String,
        reference: String,
        sortKey: String?,
        tail: Int,
        unitsPerBox: Int,
        boxes: Int,
        sign: String,
        fractionText: String,
        colisage: Double,
        packNotation: String,
        warehouse: String,
        remark: String,
        arrivalNote: String,
        createdAtRaw: String?,
        arrivalUpdatedAtRaw: String?,
        stockDisplay: String,
        stockState: InventoryStockState,
        completionStatus: CompletionStatus
    ) {
        self.id = id
        self.reference = reference
        self.sortKey = sortKey
        self.tail = tail
        self.unitsPerBox = unitsPerBox
        self.boxes = boxes
        self.sign = sign
        self.fractionText = fractionText
        self.colisage = colisage
        self.packNotation = packNotation
        self.warehouse = warehouse
        self.remark = remark
        self.arrivalNote = arrivalNote
        self.createdAtRaw = createdAtRaw
        self.arrivalUpdatedAtRaw = arrivalUpdatedAtRaw
        self.stockDisplay = stockDisplay
        self.stockState = stockState
        self.completionStatus = completionStatus
    }
}

extension HistoryEntry {
    init(
        id: String,
        timestampRaw: String,
        timestampLabel: String?,
        actionType: HistoryActionType,
        reference: String,
        rowId: String?,
        beforeDisplay: String,
        afterDisplay: String,
        remark: String,
        source: String,
        beforeTotalPieces: Int?,
        afterTotalPieces: Int?,
        beforeTimestampRaw: String?,
        beforeTimestampLabel: String?,
        movementDisplay: String?,
        businessId: String?,
        businessLineId: String?
    ) {
        self.id = id
        self.timestampRaw = timestampRaw
        self.timestampLabel = timestampLabel
        self.actionType = actionType
        self.reference = reference
        self.rowId = rowId
        self.beforeDisplay = beforeDisplay
        self.afterDisplay = afterDisplay
        self.remark = remark
        self.source = source
        self.beforeTotalPieces = beforeTotalPieces
        self.afterTotalPieces = afterTotalPieces
        self.beforeTimestampRaw = beforeTimestampRaw
        self.beforeTimestampLabel = beforeTimestampLabel
        self.movementDisplay = movementDisplay
        self.businessId = businessId
        self.businessLineId = businessLineId
    }
}

extension PickupTicket {
    init(
        ticketId: String,
        ticketNumber: String,
        status: PickupTicketStatus,
        createdAt: String,
        createdBy: String,
        updatedAt: String?,
        validatedAt: String?,
        validatedBy: String?,
        title: String,
        requestTextRaw: String,
        globalNote: String,
        lineCount: Int,
        resolvedLineCount: Int,
        blockedLineCount: Int,
        clientTicketId: String?,
        version: Int
    ) {
        self.ticketId = ticketId
        self.ticketNumber = ticketNumber
        self.status = status
        self.createdAt = createdAt
        self.createdBy = createdBy
        self.updatedAt = updatedAt
        self.validatedAt = validatedAt
        self.validatedBy = validatedBy
        self.title = title
        self.requestTextRaw = requestTextRaw
        self.globalNote = globalNote
        self.lineCount = lineCount
        self.resolvedLineCount = resolvedLineCount
        self.blockedLineCount = blockedLineCount
        self.clientTicketId = clientTicketId
        self.version = version
    }
}

extension PickupTicketLine {
    init(
        lineId: String,
        ticketId: String,
        lineNumber: Int,
        reference: String,
        status: PickupTicketLineStatus,
        requestUnit: String,
        requestQuantity: Double?,
        requestedDisplay: String,
        pickedUnit: String?,
        pickedQuantity: Double?,
        pickedDisplay: String?,
        stockAvailablePiecesSnapshot: Double?,
        stockAvailableDisplaySnapshot: String?,
        warehouseHelpDisplay: String,
        arrivalNoteSnapshot: String,
        lineNote: String,
        stockMutationId: String?,
        createdAt: String,
        updatedAt: String?
    ) {
        self.lineId = lineId
        self.ticketId = ticketId
        self.lineNumber = lineNumber
        self.reference = reference
        self.status = status
        self.requestUnit = requestUnit
        self.requestQuantity = requestQuantity
        self.requestedDisplay = requestedDisplay
        self.pickedUnit = pickedUnit
        self.pickedQuantity = pickedQuantity
        self.pickedDisplay = pickedDisplay
        self.stockAvailablePiecesSnapshot = stockAvailablePiecesSnapshot
        self.stockAvailableDisplaySnapshot = stockAvailableDisplaySnapshot
        self.warehouseHelpDisplay = warehouseHelpDisplay
        self.arrivalNoteSnapshot = arrivalNoteSnapshot
        self.lineNote = lineNote
        self.stockMutationId = stockMutationId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

extension PickupTicketEvent {
    init(
        eventId: String,
        ticketId: String,
        lineId: String?,
        eventType: String,
        actor: String,
        createdAt: String,
        message: String,
        payload: Data?
    ) {
        self.eventId = eventId
        self.ticketId = ticketId
        self.lineId = lineId
        self.eventType = eventType
        self.actor = actor
        self.createdAt = createdAt
        self.message = message
        self.payload = payload
    }
}
