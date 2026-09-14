import { describe, expect, it } from "vitest";
import { makeDebt, makeExpense, makePaystub } from "../models/types";
import { summarizeBudget } from "./budgetCalculator";

describe("summarizeBudget", () => {
  it("combines income, expenses, and debt minimums", () => {
    const paystub = makePaystub({
      payFrequency: "monthly",
      isSalaried: true,
      salaryPerPaycheck: 5000,
      taxes: [{ id: "1", name: "Federal", amountPerPaycheck: 800 }],
    });
    const expense = makeExpense({ name: "Rent", category: "housing", monthlyAmount: 1500 });
    const debt = makeDebt({ name: "Visa", type: "creditCard", balance: 2000, apr: 0.24, minimumPayment: 100 });

    const summary = summarizeBudget([paystub], [expense], [debt]);

    expect(summary.totalNetIncome).toBeCloseTo(4200, 2); // 5000 - 800
    expect(summary.manualExpenseTotal).toBeCloseTo(1500, 2);
    expect(summary.debtMinimumPaymentTotal).toBeCloseTo(100, 2);
    expect(summary.totalExpenses).toBeCloseTo(1600, 2);
    expect(summary.cashFlow).toBeCloseTo(2600, 2); // 4200 - 1600
  });

  it("reports a deficit when expenses exceed income", () => {
    const paystub = makePaystub({ payFrequency: "monthly", isSalaried: true, salaryPerPaycheck: 1000 });
    const expense = makeExpense({ name: "Rent", category: "housing", monthlyAmount: 1500 });

    const summary = summarizeBudget([paystub], [expense], []);

    expect(summary.isRunningDeficit).toBe(true);
    expect(summary.cashFlow).toBeLessThan(0);
  });

  it("groups debt minimum payments under their mapped category without double counting", () => {
    const debt = makeDebt({ name: "Student Loan", type: "studentLoan", balance: 10000, apr: 0.05, minimumPayment: 200 });
    const expense = makeExpense({ name: "Groceries", category: "groceries", monthlyAmount: 400 });

    const summary = summarizeBudget([], [expense], [debt]);

    expect(summary.expenseByCategory.studentLoan).toBe(200);
    expect(summary.expenseByCategory.groceries).toBe(400);
    expect(summary.totalExpenses).toBeCloseTo(600, 2);
  });

  it("estimates monthly debt interest from current balance and APR", () => {
    const debt = makeDebt({ name: "Card", type: "creditCard", balance: 1200, apr: 0.24, minimumPayment: 50 });
    const summary = summarizeBudget([], [], [debt]);
    expect(summary.totalMonthlyDebtInterest).toBeCloseTo((1200 * 0.24) / 12, 4);
  });
});
