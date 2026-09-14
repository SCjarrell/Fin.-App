import Foundation

/// A snapshot of one month's finances, computed from every paystub, manual expense, and
/// tracked debt currently in the app.
struct MonthlyBudgetSummary {
    let totalGrossIncome: Double
    let totalNetIncome: Double
    let totalPretaxDeductions: Double
    let totalTaxes: Double
    let totalPostTaxDeductions: Double

    let manualExpenseTotal: Double
    let debtMinimumPaymentTotal: Double
    /// Manual expenses plus every tracked debt's minimum payment.
    var totalExpenses: Double { manualExpenseTotal + debtMinimumPaymentTotal }

    /// Interest that will accrue this month across all tracked debts at minimum-payment pace.
    let totalMonthlyDebtInterest: Double

    /// What's left after every expense (including debt minimums) is paid. This is the amount
    /// available to accelerate debt payoff beyond the minimums.
    var cashFlow: Double { totalNetIncome - totalExpenses }

    /// Monthly cost per category, merging manual expenses with each debt's minimum payment
    /// (mapped to its matching category) so nothing is counted twice.
    let expenseByCategory: [ExpenseCategory: Double]

    var isRunningDeficit: Bool { cashFlow < 0 }
}

enum BudgetCalculator {
    static func summarize(paystubs: [Paystub], expenses: [Expense], debts: [Debt]) -> MonthlyBudgetSummary {
        let totalGrossIncome = paystubs.reduce(0) { $0 + $1.monthlyGrossPay }
        let totalNetIncome = paystubs.reduce(0) { $0 + $1.monthlyNetPay }
        let totalPretaxDeductions = paystubs.reduce(0) { $0 + $1.monthlyPretaxDeductions }
        let totalTaxes = paystubs.reduce(0) { $0 + $1.monthlyTaxes }
        let totalPostTaxDeductions = paystubs.reduce(0) { $0 + $1.monthlyPostTaxDeductions }

        let manualExpenseTotal = expenses.reduce(0) { $0 + $1.monthlyAmount }
        let debtMinimumPaymentTotal = debts.reduce(0) { $0 + $1.minimumPayment }
        let totalMonthlyDebtInterest = debts.reduce(0) { $0 + $1.estimatedMonthlyInterest }

        var categoryTotals: [ExpenseCategory: Double] = [:]
        for expense in expenses {
            categoryTotals[expense.category, default: 0] += expense.monthlyAmount
        }
        for debt in debts {
            categoryTotals[debt.type.expenseCategory, default: 0] += debt.minimumPayment
        }

        return MonthlyBudgetSummary(
            totalGrossIncome: totalGrossIncome,
            totalNetIncome: totalNetIncome,
            totalPretaxDeductions: totalPretaxDeductions,
            totalTaxes: totalTaxes,
            totalPostTaxDeductions: totalPostTaxDeductions,
            manualExpenseTotal: manualExpenseTotal,
            debtMinimumPaymentTotal: debtMinimumPaymentTotal,
            totalMonthlyDebtInterest: totalMonthlyDebtInterest,
            expenseByCategory: categoryTotals
        )
    }
}
