import Foundation

struct APIClientConfiguration {
    let baseURL: URL
    let session: URLSession

    static let live = APIClientConfiguration(
        baseURL: URL(string: "https://script.google.com/macros/s/AKfycbyHXo25txLTBZVPR97R2UazHTklIhIhU0k3ni8PtU34_RgEU8hxkpbL666_ezIX9CMA/exec")!,
        session: .shared
    )

    static let preview = APIClientConfiguration(baseURL: URL(string: "https://example.com/exec")!, session: .shared)
}

struct APIClient {
    let configuration: APIClientConfiguration

    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .useDefaultKeys
        return decoder
    }()

    func fetchSync() async throws -> SyncResponseDTO {
        try await get(.sync, as: SyncResponseDTO.self)
    }

    func fetchInventory() async throws -> InventoryResponseDTO {
        try await get(.inventory, as: InventoryResponseDTO.self)
    }

    func fetchHistory() async throws -> HistoryResponseDTO {
        try await get(.history, as: HistoryResponseDTO.self)
    }

    func fetchDetail(reference: String) async throws -> DetailResponseDTO {
        try await get(.detail(reference: reference), as: DetailResponseDTO.self)
    }

    func fetchPickupTickets() async throws -> PickupTicketsResponseDTO {
        try await get(.pickupTickets, as: PickupTicketsResponseDTO.self)
    }

    func fetchPickupTicketsBootstrap() async throws -> PickupTicketsBootstrapResponseDTO {
        try await get(.pickupTicketsBootstrap, as: PickupTicketsBootstrapResponseDTO.self)
    }

    func fetchPickupTicket(ticketID: String) async throws -> PickupTicketDetailResponseDTO {
        try await get(.pickupTicket(ticketID: ticketID), as: PickupTicketDetailResponseDTO.self)
    }

    private func get<T: Decodable>(_ endpoint: APIEndpoint, as type: T.Type) async throws -> T {
        let request = try endpoint.request(baseURL: configuration.baseURL)
        let (data, response) = try await configuration.session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw APIClientError.httpStatus(httpResponse.statusCode)
        }

        do {
            let payload = try decoder.decode(APIEnvelope<T>.self, from: data)
            if payload.error == true {
                throw APIClientError.serverMessage(payload.message ?? "Erreur serveur.")
            }
            guard let result = payload.result else {
                throw APIClientError.emptyPayload
            }
            return result
        } catch let error as APIClientError {
            throw error
        } catch {
            throw APIClientError.decodingFailed(error)
        }
    }
}

enum APIClientError: LocalizedError {
    case invalidResponse
    case httpStatus(Int)
    case emptyPayload
    case serverMessage(String)
    case decodingFailed(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Réponse serveur invalide."
        case let .httpStatus(status):
            return "Lecture distante impossible (\(status))."
        case .emptyPayload:
            return "Payload JSON vide."
        case let .serverMessage(message):
            return message
        case let .decodingFailed(error):
            return "Décodage JSON impossible: \(error.localizedDescription)"
        }
    }
}

private struct APIEnvelope<Result: Decodable>: Decodable {
    let error: Bool?
    let message: String?
    let result: Result?

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let result = try? container.decode(Result.self) {
            self.error = false
            self.message = nil
            self.result = result
            return
        }

        let errorContainer = try decoder.container(keyedBy: CodingKeys.self)
        self.error = try errorContainer.decodeIfPresent(Bool.self, forKey: .error)
        self.message = try errorContainer.decodeIfPresent(String.self, forKey: .message)
        self.result = nil
    }

    private enum CodingKeys: String, CodingKey {
        case error
        case message
    }
}
