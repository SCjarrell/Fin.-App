import type { DebtType } from "../models/types";

export type PayoffStrategy = "avalanche" | "snowball" | "velocityBanking";

export const PAYOFF_STRATEGIES: PayoffStrategy[] = ["avalanche", "snowball", "velocityBanking"];

export const PAYOFF_STRATEGY_LABELS: Record<PayoffStrategy, string> = {
  avalanche: "Debt Avalanche",
  snowball: "Debt Snowball",
  velocityBanking: "Velocity Banking",
};

export const PAYOFF_STRATEGY_SUMMARIES: Record<PayoffStrategy, string> = {
  avalanche:
    "Pays extra toward the highest interest-rate debt first. Mathematically minimizes total interest paid.",
  snowball:
    "Pays extra toward the smallest balance first. Builds momentum with quick wins, at the cost of a little extra interest.",
  velocityBanking:
    "Uses a line of credit to knock out one debt at a time in large chunks, then aggressively pays down the line of credit with all monthly cash flow before moving to the next debt.",
};

/** Immutable snapshot of a debt at a point in the simulation. */
export interface DebtSnapshot {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  apr: number;
  minimumPayment: number;
}

/** One simulated month of a payoff plan. */
export interface PayoffMonthEntry {
  month: number;
  /** Interest accrued this month, per debt id. */
  interestByDebt: Record<string, number>;
  /** Total paid toward each debt this month (minimum + any extra/velocity payment). */
  paymentByDebt: Record<string, number>;
  /** Remaining balance at the end of the month, per debt id. */
  remainingBalanceByDebt: Record<string, number>;
}

export function monthTotalInterest(m: PayoffMonthEntry): number {
  return Object.values(m.interestByDebt).reduce((a, b) => a + b, 0);
}

export function monthTotalPayment(m: PayoffMonthEntry): number {
  return Object.values(m.paymentByDebt).reduce((a, b) => a + b, 0);
}

export function monthTotalRemainingBalance(m: PayoffMonthEntry): number {
  return Object.values(m.remainingBalanceByDebt).reduce((a, b) => a + b, 0);
}

export interface PayoffPlanResult {
  strategy: PayoffStrategy;
  debtNames: Record<string, string>;
  months: PayoffMonthEntry[];
  totalInterestPaid: number;
  totalPaid: number;
  /** True if minimum payments don't cover accruing interest and the simulation
   * hit its safety cap without reaching zero balance. */
  neverPaysOff: boolean;
}

export function monthsToPayoff(result: PayoffPlanResult): number {
  return result.months.length;
}

export function yearsAndMonthsToPayoff(result: PayoffPlanResult): { years: number; months: number } {
  const total = monthsToPayoff(result);
  return { years: Math.floor(total / 12), months: total % 12 };
}

/** The month each debt reaches a zero balance, keyed by debt id. */
export function payoffMonthByDebt(result: PayoffPlanResult): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of result.months) {
    for (const [debtId, balance] of Object.entries(entry.remainingBalanceByDebt)) {
      if (balance <= 0.005 && out[debtId] === undefined) {
        out[debtId] = entry.month;
      }
    }
  }
  return out;
}
