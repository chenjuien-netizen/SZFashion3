import Foundation

enum DateFormatters {
    nonisolated static func syncTimeString(from date: Date) -> String {
        let calendar = Calendar.autoupdatingCurrent
        let formatter = DateFormatter()
        formatter.locale = .autoupdatingCurrent
        formatter.timeZone = .autoupdatingCurrent
        formatter.dateFormat = calendar.isDateInToday(date) ? "HH:mm" : "dd/MM HH:mm"
        return formatter.string(from: date)
    }

    nonisolated static func syncLabel(prefix: String, from date: Date?) -> String {
        guard let date else {
            return "\(prefix) jamais"
        }

        let calendar = Calendar.autoupdatingCurrent
        let formatter = DateFormatter()
        formatter.locale = .autoupdatingCurrent
        formatter.timeZone = .autoupdatingCurrent

        if calendar.isDateInToday(date) {
            formatter.dateFormat = "HH:mm"
            return "\(prefix) à \(formatter.string(from: date))"
        }

        let dateFormatter = DateFormatter()
        dateFormatter.locale = .autoupdatingCurrent
        dateFormatter.timeZone = .autoupdatingCurrent
        dateFormatter.dateFormat = "dd/MM"
        formatter.dateFormat = "HH:mm"
        return "\(prefix) le \(dateFormatter.string(from: date)) à \(formatter.string(from: date))"
    }

    nonisolated static func historyGroupLabel(timestampRaw: String) -> String {
        guard let date = parseDate(timestampRaw) else {
            return "Date inconnue"
        }

        let calendar = Calendar.autoupdatingCurrent
        if calendar.isDateInToday(date) {
            return "Aujourd’hui"
        }
        if calendar.isDateInYesterday(date) {
            return "Hier"
        }

        let formatter = DateFormatter()
        formatter.locale = .autoupdatingCurrent
        formatter.timeZone = .autoupdatingCurrent
        formatter.dateFormat = "dd/MM"
        return formatter.string(from: date)
    }

    nonisolated static func historyDateTime(timestampRaw: String?, fallback: String?) -> String {
        guard let timestampRaw, let date = parseDate(timestampRaw) else {
            return fallback?.isEmpty == false ? fallback! : "—"
        }

        let formatter = DateFormatter()
        formatter.locale = .autoupdatingCurrent
        formatter.timeZone = .autoupdatingCurrent
        formatter.dateFormat = "dd/MM/yy HH:mm"
        return formatter.string(from: date)
    }

    nonisolated private static func parseDate(_ value: String) -> Date? {
        guard !value.isEmpty else { return nil }
        let isoFormatter = ISO8601DateFormatter()
        if let date = isoFormatter.date(from: value) {
            return date
        }
        let fallbackFormatter = DateFormatter()
        fallbackFormatter.locale = Locale(identifier: "fr_FR")
        fallbackFormatter.timeZone = .autoupdatingCurrent
        fallbackFormatter.dateFormat = "dd/MM/yy HH:mm"
        return fallbackFormatter.date(from: value)
    }
}
