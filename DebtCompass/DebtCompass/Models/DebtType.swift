import SwiftUI

enum DebtType: String, Codable, CaseIterable, Identifiable {
    case creditCard
    case personalLoan
    case lineOfCredit
    case studentLoan
    case autoLoan
    case mortgage
    case other

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .creditCard: return "Credit Card"
        case .personalLoan: return "Personal Loan"
        case .lineOfCredit: return "Line of Credit"
        case .studentLoan: return "Student Loan"
        case .autoLoan: return "Auto Loan"
        case .mortgage: return "Mortgage"
        case .other: return "Other Debt"
        }
    }

    /// Where this debt's minimum payment shows up in the expense-category breakdown.
    var expenseCategory: ExpenseCategory {
        switch self {
        case .creditCard: return .creditCard
        case .personalLoan: return .personalLoan
        case .lineOfCredit: return .lineOfCredit
        case .studentLoan: return .studentLoan
        case .autoLoan: return .autoLoan
        case .mortgage: return .housing
        case .other: return .other
        }
    }

    /// Whether this debt type carries a revolving credit limit (used by velocity banking).
    var hasCreditLimit: Bool {
        switch self {
        case .creditCard, .lineOfCredit: return true
        default: return false
        }
    }
}
