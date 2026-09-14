import Foundation

enum PayFrequency: String, Codable, CaseIterable, Identifiable {
    case weekly
    case biWeekly
    case semiMonthly
    case monthly

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .weekly: return "Weekly"
        case .biWeekly: return "Every 2 Weeks"
        case .semiMonthly: return "Twice a Month"
        case .monthly: return "Monthly"
        }
    }

    /// Number of paychecks a year, used to convert a per-paycheck figure to a monthly one.
    var payPeriodsPerYear: Double {
        switch self {
        case .weekly: return 52
        case .biWeekly: return 26
        case .semiMonthly: return 24
        case .monthly: return 12
        }
    }

    var payPeriodsPerMonth: Double { payPeriodsPerYear / 12 }
}
