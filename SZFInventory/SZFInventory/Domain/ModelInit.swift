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
