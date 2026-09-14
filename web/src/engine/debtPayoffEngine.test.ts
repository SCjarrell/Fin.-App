import { describe, expect, it } from "vitest";
import { makeDebt } from "../models/types";
import { MAX_MONTHS, simulateAvalanche, simulateSnowball, simulateVelocityBanking } from "./debtPayoffEngine";
import { monthTotalRemainingBalance, payoffMonthByDebt } from "./payoffStrategy";

describe("DebtPayoffEngine", () => {
  it("pays off all debts with a positive extra payment (avalanche)", () => {
    const debtA = makeDebt({ name: "A", type: "creditCard", balance: 1000, apr: 0.1, minimumPayment: 40 });
    const debtB = makeDebt({ name: "B", type: "creditCard", balance: 1500, apr: 0.22, minimumPayment: 60 });

    const result = simulateAvalanche([debtA, debtB], 200);

    expect(result.neverPaysOff).toBe(false);
    const lastMonth = result.months[result.months.length - 1];
    expect(monthTotalRemainingBalance(lastMonth)).toBeCloseTo(0, 0);
  });

  it("pays the highest-APR debt first under avalanche", () => {
    const lowAPR = makeDebt({ name: "LowAPR", type: "personalLoan", balance: 1000, apr: 0.08, minimumPayment: 40 });
    const highAPR = makeDebt({ name: "HighAPR", type: "creditCard", balance: 1000, apr: 0.27, minimumPayment: 40 });

    const result = simulateAvalanche([lowAPR, highAPR], 150);
    const payoffMonths = payoffMonthByDebt(result);

    expect(payoffMonths[highAPR.id]).toBeDefined();
    expect(payoffMonths[lowAPR.id]).toBeDefined();
    expect(payoffMonths[highAPR.id]).toBeLessThan(payoffMonths[lowAPR.id]);
  });

  it("pays the smallest balance first under snowball, even with a lower APR", () => {
    const smallBalance = makeDebt({ name: "Small", type: "personalLoan", balance: 300, apr: 0.06, minimumPayment: 25 });
    const largeBalance = makeDebt({ name: "Large", type: "creditCard", balance: 3000, apr: 0.24, minimumPayment: 75 });

    const result = simulateSnowball([smallBalance, largeBalance], 150);
    const payoffMonths = payoffMonthByDebt(result);

    expect(payoffMonths[smallBalance.id]).toBeDefined();
    expect(payoffMonths[largeBalance.id]).toBeDefined();
    expect(payoffMonths[smallBalance.id]).toBeLessThan(payoffMonths[largeBalance.id]);
  });

  it("rolls a freed minimum payment into the remaining debt in the payoff month", () => {
    // Quick's lower APR means avalanche never sends it extra cash — it's paid
    // off by its minimum alone. Once that happens, its $25 minimum should
    // immediately roll into Slow's payment that same month.
    const quick = makeDebt({ name: "Quick", type: "personalLoan", balance: 100, apr: 0.1, minimumPayment: 25 });
    const slow = makeDebt({ name: "Slow", type: "creditCard", balance: 5000, apr: 0.2, minimumPayment: 100 });

    const result = simulateAvalanche([quick, slow], 50);
    const quickPayoffMonth = payoffMonthByDebt(result)[quick.id];
    expect(quickPayoffMonth).toBeGreaterThanOrEqual(2);

    const paymentBeforePayoff = result.months[quickPayoffMonth - 2].paymentByDebt[slow.id] ?? 0;
    const paymentAtPayoff = result.months[quickPayoffMonth - 1].paymentByDebt[slow.id] ?? 0;

    expect(paymentAtPayoff).toBeGreaterThan(paymentBeforePayoff);
  });

  it("pays off the original debt and the line of credit (velocity banking)", () => {
    const debt = makeDebt({ name: "Card", type: "creditCard", balance: 4000, apr: 0.22, minimumPayment: 120 });

    const result = simulateVelocityBanking([debt], 300, { lineOfCreditAPR: 0.09, lineOfCreditLimit: 5000 });

    expect(result.neverPaysOff).toBe(false);
    const lastMonth = result.months[result.months.length - 1];
    expect(monthTotalRemainingBalance(lastMonth)).toBeCloseTo(0, 0);
  });

  it("immediately draws against the line of credit", () => {
    const debt = makeDebt({ name: "Card", type: "creditCard", balance: 4000, apr: 0.22, minimumPayment: 120 });

    const result = simulateVelocityBanking([debt], 300, { lineOfCreditAPR: 0.09, lineOfCreditLimit: 5000 });

    const firstMonth = result.months[0];
    expect(firstMonth.remainingBalanceByDebt[debt.id] ?? -1).toBeCloseTo(0, 0);
  });

  it("never pays off when the minimum payment does not cover interest", () => {
    const debt = makeDebt({ name: "Trap", type: "creditCard", balance: 10000, apr: 0.3, minimumPayment: 50 });

    const result = simulateAvalanche([debt], 0);

    expect(result.neverPaysOff).toBe(true);
    expect(result.months.length).toBe(MAX_MONTHS);
  });

  it("produces an empty plan for an empty debt list", () => {
    const result = simulateAvalanche([], 500);
    expect(result.months).toHaveLength(0);
    expect(result.neverPaysOff).toBe(false);
  });
});
