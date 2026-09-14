import XCTest
@testable import DebtCompass

final class PaystubTests: XCTestCase {

    func testOvertimeIsCalculatedAtOneAndAHalfTimesBaseRate() {
        let paystub = Paystub(payFrequency: .biWeekly, hourlyRate: 20, regularHours: 80, overtimeHours: 10)
        XCTAssertEqual(paystub.overtimeRate, 30, accuracy: 0.001)
        XCTAssertEqual(paystub.overtimePay, 300, accuracy: 0.001) // 10 hrs * $30
        XCTAssertEqual(paystub.regularPay, 1600, accuracy: 0.001) // 80 hrs * $20
        XCTAssertEqual(paystub.grossPay, 1900, accuracy: 0.001)
    }

    func testHourlyPaystubWithNoOvertimeMatchesRegularPayOnly() {
        let paystub = Paystub(payFrequency: .weekly, hourlyRate: 25, regularHours: 40, overtimeHours: 0)
        XCTAssertEqual(paystub.overtimePay, 0)
        XCTAssertEqual(paystub.grossPay, 1000, accuracy: 0.001)
    }

    func testSalariedPaystubIgnoresHourlyFields() {
        let paystub = Paystub(payFrequency: .semiMonthly, isSalaried: true, salaryPerPaycheck: 2500,
                               hourlyRate: 999, regularHours: 999, overtimeHours: 999)
        XCTAssertEqual(paystub.grossPay, 2500, accuracy: 0.001)
    }

    func testNetPaySubtractsPretaxDeductionsTaxesAndPostTaxDeductions() {
        let paystub = Paystub(
            payFrequency: .biWeekly,
            hourlyRate: 30, regularHours: 80, overtimeHours: 0,
            pretaxDeductions: [DeductionItem(name: "401k", amountPerPaycheck: 120),
                               DeductionItem(name: "Health", amountPerPaycheck: 80)],
            taxes: [TaxWithholding(name: "Federal", amountPerPaycheck: 300),
                    TaxWithholding(name: "FICA", amountPerPaycheck: 150)],
            postTaxDeductions: [DeductionItem(name: "Roth", amountPerPaycheck: 50)]
        )
        // Gross: 2400. Pretax: 200 -> taxable 2200. Taxes: 450. Post-tax: 50.
        XCTAssertEqual(paystub.grossPay, 2400, accuracy: 0.001)
        XCTAssertEqual(paystub.taxableIncome, 2200, accuracy: 0.001)
        XCTAssertEqual(paystub.netPay, 1700, accuracy: 0.001)
    }

    func testMonthlyConversionUsesPayPeriodsPerYearOverTwelve() {
        let paystub = Paystub(payFrequency: .biWeekly, hourlyRate: 25, regularHours: 80, overtimeHours: 0)
        // 2000/paycheck * 26 periods / 12 months
        XCTAssertEqual(paystub.monthlyGrossPay, 2000 * 26.0 / 12.0, accuracy: 0.01)
    }

    func testTaxableIncomeNeverGoesNegativeWhenDeductionsExceedGross() {
        let paystub = Paystub(payFrequency: .weekly, hourlyRate: 10, regularHours: 10, overtimeHours: 0,
                               pretaxDeductions: [DeductionItem(name: "Huge", amountPerPaycheck: 500)])
        XCTAssertEqual(paystub.taxableIncome, 0)
    }
}
