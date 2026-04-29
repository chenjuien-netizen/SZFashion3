import Foundation

struct SyncResponseDTO: Codable {
    let inventory: InventoryResponseDTO
    let history: HistoryResponseDTO
    let ticketsBootstrap: PickupTicketsBootstrapResponseDTO?
    let generatedAt: String?
    let source: String?
}

struct InventoryResponseDTO: Codable {
    let items: [InventoryItemDTO]
    let summary: InventorySummaryDTO?
    let generatedAt: String?
    let source: String?
}

struct InventorySummaryDTO: Codable {
    let visibleCount: Int?
    let positiveCount: Int?
    let zeroCount: Int?
    let totalRows: Int?
    let totalBoxes: Int?
    let totalPieces: Int?
    let isPartial: Bool?
    let generatedAt: String?
}

struct InventoryItemDTO: Codable {
    let id: String
    let reference: String
    let stockDisplay: String
    let stockState: String
    let tail: Int?
    let unitsPerBox: Int?
    let itemBoxes: Int?
    let sign: String?
    let fractionText: String?
    let fractionValue: Double?
    let colisage: Double?
    let packNotation: String?
    let warehouse: String?
    let remark: String?
    let createdAt: String?
    let arrivalNote: String?
    let arrivalUpdatedAt: String?
    let arrivalUpdatedAtLabel: String?
    let arrivalUpdatedAtSort: Double?
    let completionStatus: String?

    enum CodingKeys: String, CodingKey {
        case id
        case reference
        case stockDisplay
        case stockState
        case tail
        case unitsPerBox
        case itemBoxes
        case sign
        case fractionText
        case fractionValue
        case colisage
        case packNotation
        case warehouse
        case remark
        case createdAt
        case arrivalNote
        case arrivalUpdatedAt
        case arrivalUpdatedAtLabel
        case arrivalUpdatedAtSort
        case completionStatus
    }
}

struct HistoryResponseDTO: Codable {
    let items: [HistoryEntryDTO]
    let nextOffset: Int?
    let hasMore: Bool?
    let totalMatched: Int?
    let generatedAt: String?
    let source: String?
}

struct HistoryEntryDTO: Codable {
    let timestampRaw: String?
    let timestampLabel: String?
    let actionType: String?
    let reference: String?
    let rowId: String?
    let beforeDisplay: String?
    let afterDisplay: String?
    let remark: String?
    let source: String?
    let beforeTotalPieces: Int?
    let afterTotalPieces: Int?
    let beforeTimestampRaw: String?
    let beforeTimestampLabel: String?
    let movementDisplay: String?
    let businessId: String?
    let businessLineId: String?
}

struct DetailResponseDTO: Codable {
    let item: InventoryItemDTO?
    let history: [HistoryEntryDTO]
    let nextHistoryOffset: Int?
    let hasMoreHistory: Bool?
    let generatedAt: String?
    let lastMovementAt: String?
    let notFoundInStock: Bool?
    let source: String?
}

struct PickupTicketsResponseDTO: Codable {
    let items: [PickupTicketDTO]
    let generatedAt: String?
    let source: String?
}

struct PickupTicketDTO: Codable {
    let ticketId: String
    let ticketNumber: String?
    let status: String?
    let createdAt: String?
    let createdBy: String?
    let updatedAt: String?
    let validatedAt: String?
    let validatedBy: String?
    let title: String?
    let requestTextRaw: String?
    let globalNote: String?
    let lineCount: Int?
    let resolvedLineCount: Int?
    let blockedLineCount: Int?
    let clientTicketId: String?
    let version: Int?
}

struct PickupTicketLineDTO: Codable {
    let lineId: String
    let ticketId: String?
    let lineNumber: Int?
    let reference: String?
    let status: String?
    let requestUnit: String?
    let requestQuantity: Double?
    let requestedDisplay: String?
    let pickedUnit: String?
    let pickedQuantity: Double?
    let pickedDisplay: String?
    let stockAvailablePiecesSnapshot: Double?
    let stockAvailableDisplaySnapshot: String?
    let warehouseHelpDisplay: String?
    let arrivalNoteSnapshot: String?
    let lineNote: String?
    let stockMutationId: String?
    let createdAt: String?
    let updatedAt: String?
}

struct PickupTicketEventDTO: Codable {
    let eventId: String
    let ticketId: String?
    let lineId: String?
    let eventType: String?
    let actor: String?
    let createdAt: String?
    let payload: [String: String]?
    let message: String?

    private enum CodingKeys: String, CodingKey {
        case eventId
        case ticketId
        case lineId
        case eventType
        case actor
        case createdAt
        case payload
        case message
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        eventId = try container.decode(String.self, forKey: .eventId)
        ticketId = try container.decodeIfPresent(String.self, forKey: .ticketId)
        lineId = try container.decodeIfPresent(String.self, forKey: .lineId)
        eventType = try container.decodeIfPresent(String.self, forKey: .eventType)
        actor = try container.decodeIfPresent(String.self, forKey: .actor)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        // Payload values can contain nulls/numbers from Apps Script; we do not render them in the read-only MVP.
        payload = nil
        message = try container.decodeIfPresent(String.self, forKey: .message)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(eventId, forKey: .eventId)
        try container.encodeIfPresent(ticketId, forKey: .ticketId)
        try container.encodeIfPresent(lineId, forKey: .lineId)
        try container.encodeIfPresent(eventType, forKey: .eventType)
        try container.encodeIfPresent(actor, forKey: .actor)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(payload, forKey: .payload)
        try container.encodeIfPresent(message, forKey: .message)
    }
}

struct PickupTicketsBootstrapResponseDTO: Codable {
    let items: [PickupTicketDTO]
    let detailsById: [String: PickupTicketDetailDTO]
    let generatedAt: String?
    let source: String?
}

struct PickupTicketDetailDTO: Codable {
    let ticket: PickupTicketDTO?
    let lines: [PickupTicketLineDTO]
    let events: [PickupTicketEventDTO]
}

struct PickupTicketDetailResponseDTO: Codable {
    let ticket: PickupTicketDTO?
    let lines: [PickupTicketLineDTO]
    let events: [PickupTicketEventDTO]
    let generatedAt: String?
    let source: String?
}
