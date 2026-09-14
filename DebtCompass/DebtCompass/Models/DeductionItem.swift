import Foundation

/// A single line item taken out of a paycheck — either a pretax or a post-tax deduction
/// (401(k), health insurance, HSA, Roth 401(k), union dues, wage garnishment, etc.).
struct DeductionItem: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var name: String
    /// Amount for a single pay period, as it appears on the paystub.
    var amountPerPaycheck: Double
}

/// A single tax withheld from a paycheck (federal, state, local, Social Security, Medicare, ...).
struct TaxWithholding: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var name: String
    /// Amount for a single pay period, as it appears on the paystub.
    var amountPerPaycheck: Double
}
