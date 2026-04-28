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
}
