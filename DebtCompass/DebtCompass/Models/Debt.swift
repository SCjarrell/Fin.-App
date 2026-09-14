import Foundation
import SwiftData

/// A debt being tracked for payoff planning: a credit card, personal loan, line of credit,
/// student loan, auto loan, or mortgage. This is the single source of truth used both for the
/// "cost per category" insight and for the avalanche / snowball / velocity-banking simulations.
@Model
final class Debt {
    var id: UUID = UUID()
    var name: String = ""
    var typeRawValue: String = DebtType.creditCard.rawValue
    var balance: Double = 0
    /// Annual percentage rate, as a decimal (e.g. 0.2499 for 24.99%).
    var apr: Double = 0
    var minimumPayment: Double = 0
    /// Total revolving credit limit, relevant for credit cards and lines of credit.
    var creditLimit: Double?
    var createdAt: Date = Date()

    var type: DebtType {
        get { DebtType(rawValue: typeRawValue) ?? .other }
        set { typeRawValue = newValue.rawValue }
    }

    /// Interest that will accrue on the current balance this month if only the minimum is paid.
    var estimatedMonthlyInterest: Double {
        max(0, balance) * (apr / 12)
    }

    /// Unused revolving credit available right now (credit cards / lines of credit only).
    var availableCredit: Double? {
        guard let creditLimit else { return nil }
        return max(0, creditLimit - balance)
    }

    init(name: String = "",
         type: DebtType = .creditCard,
         balance: Double = 0,
         apr: Double = 0,
         minimumPayment: Double = 0,
         creditLimit: Double? = nil) {
        self.id = UUID()
        self.name = name
        self.typeRawValue = type.rawValue
        self.balance = balance
        self.apr = apr
        self.minimumPayment = minimumPayment
        self.creditLimit = creditLimit
        self.createdAt = Date()
    }
}
