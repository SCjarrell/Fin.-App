import SwiftUI

/// Every category a monthly expense (including recurring debt payments) can fall under.
enum ExpenseCategory: String, Codable, CaseIterable, Identifiable {
    case housing
    case utilities
    case groceries
    case transportation
    case clothing
    case subscriptions
    case insurance
    case medical
    case childcare
    case entertainment
    case creditCard
    case personalLoan
    case lineOfCredit
    case studentLoan
    case autoLoan
    case other

    var id: String { rawValue }

    /// Categories a user adds by hand in the Expenses tab. Debt-payment categories are
    /// derived automatically from the Debts tab so a minimum payment is never counted twice.
    static var manualCases: [ExpenseCategory] {
        [.housing, .utilities, .groceries, .transportation, .clothing,
         .subscriptions, .insurance, .medical, .childcare, .entertainment, .other]
    }

    var displayName: String {
        switch self {
        case .housing: return "Housing"
        case .utilities: return "Utilities"
        case .groceries: return "Groceries"
        case .transportation: return "Transportation"
        case .clothing: return "Clothing"
        case .subscriptions: return "Subscriptions"
        case .insurance: return "Insurance"
        case .medical: return "Medical"
        case .childcare: return "Childcare"
        case .entertainment: return "Entertainment"
        case .creditCard: return "Credit Cards"
        case .personalLoan: return "Personal Loans"
        case .lineOfCredit: return "Lines of Credit"
        case .studentLoan: return "Student Loans"
        case .autoLoan: return "Auto Loans"
        case .other: return "Other"
        }
    }

    var systemImage: String {
        switch self {
        case .housing: return "house.fill"
        case .utilities: return "bolt.fill"
        case .groceries: return "cart.fill"
        case .transportation: return "car.fill"
        case .clothing: return "tshirt.fill"
        case .subscriptions: return "arrow.triangle.2.circlepath.circle.fill"
        case .insurance: return "shield.fill"
        case .medical: return "cross.case.fill"
        case .childcare: return "figure.and.child.holdinghands"
        case .entertainment: return "popcorn.fill"
        case .creditCard: return "creditcard.fill"
        case .personalLoan: return "banknote.fill"
        case .lineOfCredit: return "building.columns.fill"
        case .studentLoan: return "graduationcap.fill"
        case .autoLoan: return "car.circle.fill"
        case .other: return "ellipsis.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .housing: return .blue
        case .utilities: return .yellow
        case .groceries: return .green
        case .transportation: return .orange
        case .clothing: return .pink
        case .subscriptions: return .purple
        case .insurance: return .teal
        case .medical: return .red
        case .childcare: return .mint
        case .entertainment: return .indigo
        case .creditCard: return .red
        case .personalLoan: return .brown
        case .lineOfCredit: return .cyan
        case .studentLoan: return .indigo
        case .autoLoan: return .orange
        case .other: return .gray
        }
    }
}
