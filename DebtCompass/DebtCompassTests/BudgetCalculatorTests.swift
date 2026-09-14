import XCTest
@testable import DebtCompass

final class BudgetCalculatorTests: XCTestCase {

    func testSummarizeCombinesIncomeExpensesAndDebtMinimums() {
        let paystub = Paystub(payFrequency: .monthly, isSalaried: true, salaryPerPaycheck: 5000,
                               taxes: [TaxWithholding(name: "Federal", amountPerPaycheck: 800)])
        let expense = Expense(name: "Rent", category: .housing, monthlyAmount: 1500)
        let debt = Debt(name: "Visa", type: .creditCard, balance: 2000, apr: 0.24, minimumPayment: 100)

        let summary = BudgetCalculator.summarize(paystubs: [paystub], expenses: [expense], debts: [debt])

        XCTAssertEqual(summary.totalNetIncome, 4200, accuracy: 0.01) // 5000 - 800
        XCTAssertEqual(summary.manualExpenseTotal, 1500, accuracy: 0.01)
        XCTAssertEqual(summary.debtMinimumPaymentTotal, 100, accuracy: 0.01)
        XCTAssertEqual(summary.totalExpenses, 1600, accuracy: 0.01)
        XCTAssertEqual(summary.cashFlow, 2600, accuracy: 0.01) // 4200 - 1600
    }

    func testCashFlowIsNegativeWhenExpensesExceedIncome() {
        let paystub = Paystub(payFrequency: .monthly, isSalaried: true, salaryPerPaycheck: 1000)
        let expense = Expense(name: "Rent", category: .housing, monthlyAmount: 1500)

        let summary = BudgetCalculator.summarize(paystubs: [paystub], expenses: [expense], debts: [])

        XCTAssertTrue(summary.isRunningDeficit)
        XCTAssertLessThan(summary.cashFlow, 0)
    }

    func testDebtMinimumPaymentsAreGroupedUnderTheirMappedCategoryNotDoubleCounted() {
        let debt = Debt(name: "Student Loan", type: .studentLoan, balance: 10000, apr: 0.05, minimumPayment: 200)
        let expense = Expense(name: "Groceries", category: .groceries, monthlyAmount: 400)

        let summary = BudgetCalculator.summarize(paystubs: [], expenses: [expense], debts: [debt])

        XCTAssertEqual(summary.expenseByCategory[.studentLoan], 200)
        XCTAssertEqual(summary.expenseByCategory[.groceries], 400)
        XCTAssertEqual(summary.totalExpenses, 600, accuracy: 0.01)
    }

    func testMonthlyDebtInterestEstimateUsesCurrentBalanceAndAPR() {
        let debt = Debt(name: "Card", type: .creditCard, balance: 1200, apr: 0.24, minimumPayment: 50)
        let summary = BudgetCalculator.summarize(paystubs: [], expenses: [], debts: [debt])
        XCTAssertEqual(summary.totalMonthlyDebtInterest, 1200 * 0.24 / 12, accuracy: 0.001)
    }
}
