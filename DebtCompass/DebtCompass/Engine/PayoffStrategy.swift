import Foundation

enum PayoffStrategy: String, CaseIterable, Identifiable {
    case avalanche
    case snowball
    case velocityBanking

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .avalanche: return "Debt Avalanche"
        case .snowball: return "Debt Snowball"
        case .velocityBanking: return "Velocity Banking"
        }
    }

    var summary: String {
        switch self {
        case .avalanche:
            return "Pays extra toward the highest interest-rate debt first. Mathematically minimizes total interest paid."
        case .snowball:
            return "Pays extra toward the smallest balance first. Builds momentum with quick wins, at the cost of a little extra interest."
        case .velocityBanking:
            return "Uses a line of credit to knock out one debt at a time in large chunks, then aggressively pays down the line of credit with all monthly cash flow before moving to the next debt."
        }
    }
}

/// Immutable snapshot of a debt at a point in the simulation.
struct DebtSnapshot: Identifiable {
    let id: UUID
    let name: String
    let type: DebtType
    var balance: Double
    let apr: Double
    let minimumPayment: Double
}

/// One simulated month of a payoff plan.
struct PayoffMonthEntry: Identifiable {
    var id: Int { month }
    let month: Int
    /// Interest accrued this month, per debt id.
    let interestByDebt: [UUID: Double]
    /// Total paid toward each debt this month (minimum + any extra/velocity payment).
    let paymentByDebt: [UUID: Double]
    /// Remaining balance at the end of the month, per debt id.
    let remainingBalanceByDebt: [UUID: Double]

    var totalInterest: Double { interestByDebt.values.reduce(0, +) }
    var totalPayment: Double { paymentByDebt.values.reduce(0, +) }
    var totalRemainingBalance: Double { remainingBalanceByDebt.values.reduce(0, +) }
}

struct PayoffPlanResult {
    let strategy: PayoffStrategy
    let debtNames: [UUID: String]
    let months: [PayoffMonthEntry]
    let totalInterestPaid: Double
    let totalPaid: Double
    /// True if minimum payments don't cover accruing interest and the simulation hit its
    /// safety cap without reaching zero balance.
    let neverPaysOff: Bool

    var monthsToPayoff: Int { months.count }

    var yearsAndMonthsToPayoff: (years: Int, months: Int) {
        (monthsToPayoff / 12, monthsToPayoff % 12)
    }

    /// The month each debt reaches a zero balance, keyed by debt id.
    var payoffMonthByDebt: [UUID: Int] {
        var result: [UUID: Int] = [:]
        for entry in months {
            for (debtID, balance) in entry.remainingBalanceByDebt where balance <= 0.005 {
                if result[debtID] == nil { result[debtID] = entry.month }
            }
        }
        return result
    }
}
