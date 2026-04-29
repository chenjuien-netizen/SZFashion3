import Foundation

enum APIEndpoint {
    case sync
    case inventory
    case history
    case detail(reference: String)
    case pickupTickets
    case pickupTicketsBootstrap
    case pickupTicket(ticketID: String)

    func request(baseURL: URL) throws -> URLRequest {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw APIClientError.invalidResponse
        }

        components.queryItems = queryItems

        guard let url = components.url else {
            throw APIClientError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.cachePolicy = .reloadIgnoringLocalCacheData
        return request
    }

    private var queryItems: [URLQueryItem] {
        switch self {
        case .sync:
            return [URLQueryItem(name: "route", value: "sync")]
        case .inventory:
            return [URLQueryItem(name: "route", value: "inventory")]
        case .history:
            return [URLQueryItem(name: "route", value: "history")]
        case let .detail(reference):
            return [
                URLQueryItem(name: "route", value: "detail"),
                URLQueryItem(name: "reference", value: reference)
            ]
        case .pickupTickets:
            return [URLQueryItem(name: "route", value: "pickup_tickets")]
        case .pickupTicketsBootstrap:
            return [URLQueryItem(name: "route", value: "pickup_tickets_bootstrap")]
        case let .pickupTicket(ticketID):
            return [
                URLQueryItem(name: "route", value: "pickup_ticket"),
                URLQueryItem(name: "ticket_id", value: ticketID)
            ]
        }
    }
}
