import Foundation

enum InventoryStockState: String, Codable, Sendable {
    case inStock
    case outOfStock

    init(apiValue: String) {
        self = apiValue == "positive" ? .inStock : .outOfStock
    }
}

enum CompletionStatus: String, Codable, Sendable {
    case complete
    case incomplete

    init(apiValue: String) {
        self = apiValue == "complete" ? .complete : .incomplete
    }
}

struct InventoryItem: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let reference: String
    let sortKey: String?
    let tail: Int
    let unitsPerBox: Int
    let boxes: Int
    let sign: String
    let fractionText: String
    let colisage: Double
    let packNotation: String
    let warehouse: String
    let remark: String
    let arrivalNote: String
    let createdAtRaw: String?
    let arrivalUpdatedAtRaw: String?
    let stockDisplay: String
    let stockState: InventoryStockState
    let completionStatus: CompletionStatus

    init(dto: InventoryItemDTO) {
        id = dto.id
        reference = dto.reference
        sortKey = dto.arrivalUpdatedAtLabel
        tail = dto.tail ?? 0
        unitsPerBox = dto.unitsPerBox ?? 0
        boxes = dto.itemBoxes ?? 0
        sign = dto.sign ?? ""
        fractionText = dto.fractionText ?? ""
        colisage = dto.colisage ?? 0
        packNotation = dto.packNotation ?? ""
        warehouse = dto.warehouse ?? ""
        remark = dto.remark ?? ""
        arrivalNote = dto.arrivalNote ?? ""
        createdAtRaw = dto.createdAt
        arrivalUpdatedAtRaw = dto.arrivalUpdatedAt
        stockDisplay = dto.stockDisplay
        stockState = InventoryStockState(apiValue: dto.stockState)
        completionStatus = CompletionStatus(apiValue: dto.completionStatus ?? "")
    }
}
