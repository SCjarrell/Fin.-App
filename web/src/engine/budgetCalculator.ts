import {
  type Debt,
  type Expense,
  type ExpenseCategory,
  type Paystub,
  debtExpenseCategory,
  debtMonthlyInterest,
  monthlyGrossPay,
  monthlyNetPay,
  monthlyPostTaxDeductions,
  monthlyPretaxDeductions,
  monthlyTaxes,
} from "../models/types";

/** A snapshot of one month's finances, computed from every paystub, manual
 * expense, and tracked debt currently in the app. */
export interface MonthlyBudgetSummary {
  totalGrossIncome: number;
  totalNetIncome: number;
  totalPretaxDeductions: number;
  totalTaxes: number;
  totalPostTaxDeductions: number;

  manualExpenseTotal: number;
  debtMinimumPaymentTotal: number;
  /** Manual expenses plus every tracked debt's minimum payment. */
  totalExpenses: number;

  /** Interest that will accrue this month across all tracked debts at minimum-payment pace. */
  totalMonthlyDebtInterest: number;

  /** What's left after every expense (including debt minimums) is paid. This
   * is the amount available to accelerate debt payoff beyond the minimums. */
  cashFlow: number;

  /** Monthly cost per category, merging manual expenses with each debt's
   * minimum payment (mapped to its matching category) so nothing is counted twice. */
  expenseByCategory: Partial<Record<ExpenseCategory, number>>;

  isRunningDeficit: boolean;
}

export function summarizeBudget(
  paystubs: Paystub[],
  expenses: Expense[],
  debts: Debt[]
): MonthlyBudgetSummary {
  const totalGrossIncome = paystubs.reduce((sum, p) => sum + monthlyGrossPay(p), 0);
  const totalNetIncome = paystubs.reduce((sum, p) => sum + monthlyNetPay(p), 0);
  const totalPretaxDeductions = paystubs.reduce((sum, p) => sum + monthlyPretaxDeductions(p), 0);
  const totalTaxes = paystubs.reduce((sum, p) => sum + monthlyTaxes(p), 0);
  const totalPostTaxDeductions = paystubs.reduce((sum, p) => sum + monthlyPostTaxDeductions(p), 0);

  const manualExpenseTotal = expenses.reduce((sum, e) => sum + e.monthlyAmount, 0);
  const debtMinimumPaymentTotal = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const totalMonthlyDebtInterest = debts.reduce((sum, d) => sum + debtMonthlyInterest(d), 0);

  const expenseByCategory: Partial<Record<ExpenseCategory, number>> = {};
  for (const expense of expenses) {
    expenseByCategory[expense.category] = (expenseByCategory[expense.category] ?? 0) + expense.monthlyAmount;
  }
  for (const debt of debts) {
    const category = debtExpenseCategory(debt.type);
    expenseByCategory[category] = (expenseByCategory[category] ?? 0) + debt.minimumPayment;
  }

  const totalExpenses = manualExpenseTotal + debtMinimumPaymentTotal;
  const cashFlow = totalNetIncome - totalExpenses;

  return {
    totalGrossIncome,
    totalNetIncome,
    totalPretaxDeductions,
    totalTaxes,
    totalPostTaxDeductions,
    manualExpenseTotal,
    debtMinimumPaymentTotal,
    totalExpenses,
    totalMonthlyDebtInterest,
    cashFlow,
    expenseByCategory,
    isRunningDeficit: cashFlow < 0,
  };
}
