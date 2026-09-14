import Foundation
import SwiftData

/// An income source modeled directly off a real paystub: hourly or salaried pay, overtime at
/// 1.5x the base rate, itemized pretax deductions, itemized taxes, and itemized post-tax
/// deductions. All of the math the app needs (gross pay, taxable income, net pay, and their
/// monthly equivalents) is derived here.
@Model
final class Paystub {
    var id: UUID = UUID()
    var employerName: String = ""
    var payFrequencyRawValue: String = PayFrequency.biWeekly.rawValue
    var isSalaried: Bool = false

    /// Base salary for one pay period, used only when `isSalaried` is true.
    var salaryPerPaycheck: Double = 0

    /// Base hourly rate, used only when `isSalaried` is false.
    var hourlyRate: Double = 0
    var regularHours: Double = 0
    /// Hours worked beyond the regular schedule, paid at 1.5x `hourlyRate`.
    var overtimeHours: Double = 0

    /// Anything else on the paystub that adds to gross pay: bonus, commission, tips, holiday pay.
    var otherGrossPay: Double = 0

    var pretaxDeductions: [DeductionItem] = []
    var taxes: [TaxWithholding] = []
    var postTaxDeductions: [DeductionItem] = []

    var createdAt: Date = Date()

    var payFrequency: PayFrequency {
        get { PayFrequency(rawValue: payFrequencyRawValue) ?? .biWeekly }
        set { payFrequencyRawValue = newValue.rawValue }
    }

    // MARK: - Per-paycheck math

    var overtimeRate: Double { hourlyRate * 1.5 }
    var regularPay: Double { isSalaried ? 0 : hourlyRate * regularHours }
    var overtimePay: Double { isSalaried ? 0 : overtimeRate * overtimeHours }

    var grossPay: Double {
        let base = isSalaried ? salaryPerPaycheck : regularPay + overtimePay
        return base + otherGrossPay
    }

    var totalPretaxDeductions: Double { pretaxDeductions.reduce(0) { $0 + $1.amountPerPaycheck } }
    var taxableIncome: Double { max(0, grossPay - totalPretaxDeductions) }
    var totalTaxes: Double { taxes.reduce(0) { $0 + $1.amountPerPaycheck } }
    var totalPostTaxDeductions: Double { postTaxDeductions.reduce(0) { $0 + $1.amountPerPaycheck } }

    var netPay: Double {
        taxableIncome - totalTaxes - totalPostTaxDeductions
    }

    // MARK: - Monthly equivalents

    private var periodsPerMonth: Double { payFrequency.payPeriodsPerMonth }

    var monthlyGrossPay: Double { grossPay * periodsPerMonth }
    var monthlyTaxableIncome: Double { taxableIncome * periodsPerMonth }
    var monthlyPretaxDeductions: Double { totalPretaxDeductions * periodsPerMonth }
    var monthlyTaxes: Double { totalTaxes * periodsPerMonth }
    var monthlyPostTaxDeductions: Double { totalPostTaxDeductions * periodsPerMonth }
    var monthlyNetPay: Double { netPay * periodsPerMonth }

    init(employerName: String = "",
         payFrequency: PayFrequency = .biWeekly,
         isSalaried: Bool = false,
         salaryPerPaycheck: Double = 0,
         hourlyRate: Double = 0,
         regularHours: Double = 0,
         overtimeHours: Double = 0,
         otherGrossPay: Double = 0,
         pretaxDeductions: [DeductionItem] = [],
         taxes: [TaxWithholding] = [],
         postTaxDeductions: [DeductionItem] = []) {
        self.id = UUID()
        self.employerName = employerName
        self.payFrequencyRawValue = payFrequency.rawValue
        self.isSalaried = isSalaried
        self.salaryPerPaycheck = salaryPerPaycheck
        self.hourlyRate = hourlyRate
        self.regularHours = regularHours
        self.overtimeHours = overtimeHours
        self.otherGrossPay = otherGrossPay
        self.pretaxDeductions = pretaxDeductions
        self.taxes = taxes
        self.postTaxDeductions = postTaxDeductions
        self.createdAt = Date()
    }
}
