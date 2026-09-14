import Foundation
import SwiftData

/// A recurring monthly expense the user enters by hand (rent, groceries, a subscription, ...).
/// Debt minimum payments are *not* entered here — they are derived from the Debts tab so a
/// payment is never double-counted.
@Model
final class Expense {
    var id: UUID = UUID()
    var name: String = ""
    var categoryRawValue: String = ExpenseCategory.other.rawValue
    /// Recurring cost for one month.
    var monthlyAmount: Double = 0
    var notes: String = ""
    var createdAt: Date = Date()

    var category: ExpenseCategory {
        get { ExpenseCategory(rawValue: categoryRawValue) ?? .other }
        set { categoryRawValue = newValue.rawValue }
    }

    init(name: String = "",
         category: ExpenseCategory = .other,
         monthlyAmount: Double = 0,
         notes: String = "") {
        self.id = UUID()
        self.name = name
        self.categoryRawValue = category.rawValue
        self.monthlyAmount = monthlyAmount
        self.notes = notes
        self.createdAt = Date()
    }
}
