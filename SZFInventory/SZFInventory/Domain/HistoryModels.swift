import Foundation

enum HistoryActionType: Hashable, Codable, Sendable {
    case entry
    case exit
    case adjustment
    case pickupTicket
    case other(String)

    init(apiValue: String) {
        switch apiValue {
        case "entry": self = .entry
        case "exit": self = .exit
        case "adjustment": self = .adjustment
        case "pickup_ticket": self = .pickupTicket
        default: self = .other(apiValue)
        }
    }

    var label: String {
        switch self {
        case .entry: return "Entrée"
        case .exit: return "Sortie"
        case .adjustment: return "Ajustement"
        case .pickupTicket: return "Pickup"
        case let .other(value): return value.isEmpty ? "Autre" : value
        }
    }

    var rawValueForFilter: String {
        switch self {
        case .entry: return "entry"
        case .exit: return "exit"
        case .adjustment: return "adjustment"
        case .pickupTicket: return "pickup_ticket"
        case let .other(value): return value
        }
    }
}

struct HistoryEntry: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let timestampRaw: String
    let timestampLabel: String?
    let actionType: HistoryActionType
    let reference: String
    let rowId: String?
    let beforeDisplay: String
    let afterDisplay: String
    let remark: String
    let source: String
    let beforeTotalPieces: Int?
    let afterTotalPieces: Int?
    let beforeTimestampRaw: String?
    let beforeTimestampLabel: String?
    let movementDisplay: String?
    let businessId: String?
    let businessLineId: String?

    init(dto: HistoryEntryDTO) {
        timestampRaw = dto.timestampRaw ?? ""
        reference = dto.reference ?? ""
        rowId = dto.rowId
        id = [timestampRaw, reference, rowId ?? "", dto.businessId ?? ""].joined(separator: "::")
        timestampLabel = dto.timestampLabel
        actionType = HistoryActionType(apiValue: dto.actionType ?? "")
        beforeDisplay = dto.beforeDisplay ?? ""
        afterDisplay = dto.afterDisplay ?? ""
        remark = dto.remark ?? ""
        source = dto.source ?? ""
        beforeTotalPieces = dto.beforeTotalPieces
        afterTotalPieces = dto.afterTotalPieces
        beforeTimestampRaw = dto.beforeTimestampRaw
        beforeTimestampLabel = dto.beforeTimestampLabel
        movementDisplay = dto.movementDisplay
        businessId = dto.businessId
        businessLineId = dto.businessLineId
    }
}
