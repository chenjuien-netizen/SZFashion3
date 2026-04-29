import Foundation

enum PickupTicketStatus: Hashable, Codable, Sendable {
    case draft
    case inProgress
    case validated
    case cancelled
    case other(String)

    init(apiValue: String) {
        switch apiValue {
        case "draft": self = .draft
        case "in_progress": self = .inProgress
        case "validated": self = .validated
        case "cancelled": self = .cancelled
        default: self = .other(apiValue)
        }
    }

    var label: String {
        switch self {
        case .draft: return "Brouillon"
        case .inProgress: return "En cours"
        case .validated: return "Validé"
        case .cancelled: return "Annulé"
        case let .other(value): return value.isEmpty ? "Autre" : value
        }
    }

    var rawValueForStorage: String {
        switch self {
        case .draft: return "draft"
        case .inProgress: return "in_progress"
        case .validated: return "validated"
        case .cancelled: return "cancelled"
        case let .other(value): return value
        }
    }
}

enum PickupTicketLineStatus: Hashable, Codable, Sendable {
    case pending
    case resolved
    case blocked
    case other(String)

    init(apiValue: String) {
        switch apiValue {
        case "pending": self = .pending
        case "resolved": self = .resolved
        case "blocked": self = .blocked
        default: self = .other(apiValue)
        }
    }

    var label: String {
        switch self {
        case .pending: return "À traiter"
        case .resolved: return "Résolu"
        case .blocked: return "Bloqué"
        case let .other(value): return value.isEmpty ? "Autre" : value
        }
    }

    var rawValueForStorage: String {
        switch self {
        case .pending: return "pending"
        case .resolved: return "resolved"
        case .blocked: return "blocked"
        case let .other(value): return value
        }
    }
}

struct PickupTicket: Identifiable, Codable, Hashable, Sendable {
    let ticketId: String
    let ticketNumber: String
    let status: PickupTicketStatus
    let createdAt: String
    let createdBy: String
    let updatedAt: String?
    let validatedAt: String?
    let validatedBy: String?
    let title: String
    let requestTextRaw: String
    let globalNote: String
    let lineCount: Int
    let resolvedLineCount: Int
    let blockedLineCount: Int
    let clientTicketId: String?
    let version: Int

    var id: String { ticketId }

    init(dto: PickupTicketDTO) {
        ticketId = dto.ticketId
        ticketNumber = dto.ticketNumber ?? ""
        status = PickupTicketStatus(apiValue: dto.status ?? "")
        createdAt = dto.createdAt ?? ""
        createdBy = dto.createdBy ?? ""
        updatedAt = dto.updatedAt
        validatedAt = dto.validatedAt
        validatedBy = dto.validatedBy
        title = dto.title ?? ""
        requestTextRaw = dto.requestTextRaw ?? ""
        globalNote = dto.globalNote ?? ""
        lineCount = dto.lineCount ?? 0
        resolvedLineCount = dto.resolvedLineCount ?? 0
        blockedLineCount = dto.blockedLineCount ?? 0
        clientTicketId = dto.clientTicketId
        version = dto.version ?? 0
    }
}

struct PickupTicketLine: Identifiable, Codable, Hashable, Sendable {
    let lineId: String
    let ticketId: String
    let lineNumber: Int
    let reference: String
    let status: PickupTicketLineStatus
    let requestUnit: String
    let requestQuantity: Double?
    let requestedDisplay: String
    let pickedUnit: String?
    let pickedQuantity: Double?
    let pickedDisplay: String?
    let stockAvailablePiecesSnapshot: Double?
    let stockAvailableDisplaySnapshot: String?
    let warehouseHelpDisplay: String
    let arrivalNoteSnapshot: String
    let lineNote: String
    let stockMutationId: String?
    let createdAt: String
    let updatedAt: String?

    var id: String { lineId }

    init(dto: PickupTicketLineDTO) {
        lineId = dto.lineId
        ticketId = dto.ticketId ?? ""
        lineNumber = dto.lineNumber ?? 0
        reference = dto.reference ?? ""
        status = PickupTicketLineStatus(apiValue: dto.status ?? "")
        requestUnit = dto.requestUnit ?? ""
        requestQuantity = dto.requestQuantity
        requestedDisplay = dto.requestedDisplay ?? ""
        pickedUnit = dto.pickedUnit
        pickedQuantity = dto.pickedQuantity
        pickedDisplay = dto.pickedDisplay
        stockAvailablePiecesSnapshot = dto.stockAvailablePiecesSnapshot
        stockAvailableDisplaySnapshot = dto.stockAvailableDisplaySnapshot
        warehouseHelpDisplay = dto.warehouseHelpDisplay ?? ""
        arrivalNoteSnapshot = dto.arrivalNoteSnapshot ?? ""
        lineNote = dto.lineNote ?? ""
        stockMutationId = dto.stockMutationId
        createdAt = dto.createdAt ?? ""
        updatedAt = dto.updatedAt
    }
}

struct PickupTicketEvent: Identifiable, Codable, Hashable, Sendable {
    let eventId: String
    let ticketId: String
    let lineId: String?
    let eventType: String
    let actor: String
    let createdAt: String
    let message: String
    let payload: Data?

    var id: String { eventId }

    init(dto: PickupTicketEventDTO) {
        eventId = dto.eventId
        ticketId = dto.ticketId ?? ""
        lineId = dto.lineId
        eventType = dto.eventType ?? ""
        actor = dto.actor ?? ""
        createdAt = dto.createdAt ?? ""
        message = dto.message ?? ""
        payload = try? JSONSerialization.data(withJSONObject: dto.payload ?? [:], options: [.sortedKeys])
    }
}

struct PickupTicketDetail: Codable, Hashable, Sendable {
    let ticket: PickupTicket
    let lines: [PickupTicketLine]
    let events: [PickupTicketEvent]
}
