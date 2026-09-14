import type { Debt } from "../models/types";
import type { DebtSnapshot, PayoffMonthEntry, PayoffPlanResult } from "./payoffStrategy";

/**
 * Simulates paying off a set of debts month by month under each of the three
 * strategies.
 *
 * All three strategies share the same monthly interest accrual
 * (`balance * apr / 12`) so their results are directly comparable. They
 * differ only in how extra cash flow is targeted:
 *  - Avalanche: extra cash always goes to the active debt with the highest APR.
 *  - Snowball: extra cash always goes to the active debt with the smallest balance.
 *  - Velocity banking: a line of credit is used to pay off one debt at a time
 *    in a lump sum, then every dollar of monthly cash flow attacks the line
 *    of credit before moving to the next debt. This is a simplified model —
 *    real-world velocity banking depends heavily on the timing of daily cash
 *    flow through the line of credit, which a monthly simulation can only
 *    approximate.
 *
 * In every strategy, once a debt is paid off its minimum payment is "freed"
 * and rolls into the pool of extra cash applied to the next target, which is
 * what makes these strategies accelerate over time instead of just applying
 * a flat extra payment.
 */

// 50-year safety cap so a plan that can't amortize still terminates.
export const MAX_MONTHS = 600;

function toSnapshots(debts: Debt[]): DebtSnapshot[] {
  return debts.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    balance: Math.max(0, d.balance),
    apr: Math.max(0, d.apr),
    minimumPayment: Math.max(0, d.minimumPayment),
  }));
}

function simulateWaterfall(
  debts: Debt[],
  extraMonthlyPayment: number,
  strategy: "avalanche" | "snowball",
  priorityOrder: (active: DebtSnapshot[]) => string[]
): PayoffPlanResult {
  const snapshots = toSnapshots(debts);
  const debtNames: Record<string, string> = {};
  for (const s of snapshots) debtNames[s.id] = s.name;

  const totalOriginalMinimum = snapshots.reduce((sum, s) => sum + s.minimumPayment, 0);
  const extra = Math.max(0, extraMonthlyPayment);

  const months: PayoffMonthEntry[] = [];
  let totalInterestPaid = 0;
  let totalPaid = 0;
  let month = 0;

  while (snapshots.some((s) => s.balance > 0.005) && month < MAX_MONTHS) {
    month += 1;
    const interestByDebt: Record<string, number> = {};
    const paymentByDebt: Record<string, number> = {};

    // 1. Accrue a month of interest on every active balance.
    for (const s of snapshots) {
      if (s.balance <= 0.005) continue;
      const interest = s.balance * (s.apr / 12);
      s.balance += interest;
      interestByDebt[s.id] = interest;
      totalInterestPaid += interest;
    }

    // 2. Pay the minimum on every active debt.
    for (const s of snapshots) {
      if (s.balance <= 0.005) continue;
      const payment = Math.min(s.minimumPayment, s.balance);
      s.balance -= payment;
      paymentByDebt[s.id] = (paymentByDebt[s.id] ?? 0) + payment;
      totalPaid += payment;
    }

    // 3. Roll extra cash flow, plus any minimums freed by already-paid-off
    //    debts, into the highest-priority remaining debt (waterfalling to the
    //    next if paid off).
    const active = snapshots.filter((s) => s.balance > 0.005);
    const activeMinimums = active.reduce((sum, s) => sum + s.minimumPayment, 0);
    let pool = extra + Math.max(0, totalOriginalMinimum - activeMinimums);

    for (const debtId of priorityOrder(active)) {
      if (pool <= 0.005) break;
      const s = snapshots.find((x) => x.id === debtId);
      if (!s || s.balance <= 0.005) continue;
      const payment = Math.min(pool, s.balance);
      s.balance -= payment;
      paymentByDebt[debtId] = (paymentByDebt[debtId] ?? 0) + payment;
      totalPaid += payment;
      pool -= payment;
    }

    const remainingBalanceByDebt: Record<string, number> = {};
    for (const s of snapshots) remainingBalanceByDebt[s.id] = Math.max(0, s.balance);

    months.push({ month, interestByDebt, paymentByDebt, remainingBalanceByDebt });
  }

  const neverPaysOff = snapshots.some((s) => s.balance > 0.005);
  return { strategy, debtNames, months, totalInterestPaid, totalPaid, neverPaysOff };
}

export function simulateAvalanche(debts: Debt[], extraMonthlyPayment: number): PayoffPlanResult {
  return simulateWaterfall(debts, extraMonthlyPayment, "avalanche", (active) =>
    [...active]
      .sort((a, b) => (a.apr !== b.apr ? b.apr - a.apr : a.balance - b.balance))
      .map((s) => s.id)
  );
}

export function simulateSnowball(debts: Debt[], extraMonthlyPayment: number): PayoffPlanResult {
  return simulateWaterfall(debts, extraMonthlyPayment, "snowball", (active) =>
    [...active]
      .sort((a, b) => (a.balance !== b.balance ? a.balance - b.balance : b.apr - a.apr))
      .map((s) => s.id)
  );
}

export interface VelocityBankingOptions {
  lineOfCreditAPR: number;
  lineOfCreditLimit: number;
  existingLineOfCreditBalance?: number;
}

export function simulateVelocityBanking(
  debts: Debt[],
  extraMonthlyPayment: number,
  options: VelocityBankingOptions
): PayoffPlanResult {
  const snapshots = toSnapshots(debts);
  const locId = "line-of-credit";
  const debtNames: Record<string, string> = { [locId]: "Line of Credit" };
  for (const s of snapshots) debtNames[s.id] = s.name;

  // Fixed avalanche-style targeting order, decided once up front: highest
  // APR first, since that's the debt where an early lump-sum payoff saves
  // the most interest.
  const priorityOrder = [...snapshots]
    .sort((a, b) => (a.apr !== b.apr ? b.apr - a.apr : a.balance - b.balance))
    .map((s) => s.id);

  const totalOriginalMinimum = snapshots.reduce((sum, s) => sum + s.minimumPayment, 0);
  const extra = Math.max(0, extraMonthlyPayment);
  const creditLimit = Math.max(0, options.lineOfCreditLimit);
  const locAPR = Math.max(0, options.lineOfCreditAPR);

  const absorbed = new Set<string>();
  let locBalance = Math.max(0, options.existingLineOfCreditBalance ?? 0);

  const months: PayoffMonthEntry[] = [];
  let totalInterestPaid = 0;
  let totalPaid = 0;
  let month = 0;

  function currentTarget(): DebtSnapshot | undefined {
    for (const id of priorityOrder) {
      if (absorbed.has(id)) continue;
      const s = snapshots.find((x) => x.id === id);
      if (s && s.balance > 0.005) return s;
    }
    return undefined;
  }

  while (
    (snapshots.some((s) => !absorbed.has(s.id) && s.balance > 0.005) || locBalance > 0.005) &&
    month < MAX_MONTHS
  ) {
    month += 1;
    const interestByDebt: Record<string, number> = {};
    const paymentByDebt: Record<string, number> = {};

    // 1. Accrue interest: on every non-absorbed original debt, and on the LOC balance.
    for (const s of snapshots) {
      if (absorbed.has(s.id) || s.balance <= 0.005) continue;
      const interest = s.balance * (s.apr / 12);
      s.balance += interest;
      interestByDebt[s.id] = interest;
      totalInterestPaid += interest;
    }
    if (locBalance > 0.005) {
      const locInterest = locBalance * (locAPR / 12);
      locBalance += locInterest;
      interestByDebt[locId] = locInterest;
      totalInterestPaid += locInterest;
    }

    // 2. Pay minimums on every debt that hasn't yet been absorbed into the LOC.
    for (const s of snapshots) {
      if (absorbed.has(s.id) || s.balance <= 0.005) continue;
      const payment = Math.min(s.minimumPayment, s.balance);
      s.balance -= payment;
      paymentByDebt[s.id] = (paymentByDebt[s.id] ?? 0) + payment;
      totalPaid += payment;
    }

    // 3. Draw against the LOC to knock out as much of the current target debt
    //    as available credit allows. This is a balance transfer, not new
    //    cash spent, so it counts toward that debt's payoff progress but not
    //    toward totalPaid.
    const target = currentTarget();
    if (target) {
      const availableRoom = Math.max(0, creditLimit - locBalance);
      if (availableRoom > 0.005) {
        const draw = Math.min(availableRoom, target.balance);
        target.balance -= draw;
        locBalance += draw;
        paymentByDebt[target.id] = (paymentByDebt[target.id] ?? 0) + draw;
        if (target.balance <= 0.005) absorbed.add(target.id);
      }
    }

    // 4. Every dollar of freed-up minimums plus extra cash flow attacks the LOC first.
    const activeMinimums = snapshots
      .filter((s) => !absorbed.has(s.id) && s.balance > 0.005)
      .reduce((sum, s) => sum + s.minimumPayment, 0);
    let pool = extra + Math.max(0, totalOriginalMinimum - activeMinimums);

    if (locBalance > 0.005 && pool > 0.005) {
      const payment = Math.min(pool, locBalance);
      locBalance -= payment;
      paymentByDebt[locId] = (paymentByDebt[locId] ?? 0) + payment;
      totalPaid += payment;
      pool -= payment;
    }

    // 5. Any cash flow left over (LOC already clear) goes straight at the current target.
    const targetAfterLOC = currentTarget();
    if (pool > 0.005 && targetAfterLOC) {
      const payment = Math.min(pool, targetAfterLOC.balance);
      targetAfterLOC.balance -= payment;
      paymentByDebt[targetAfterLOC.id] = (paymentByDebt[targetAfterLOC.id] ?? 0) + payment;
      totalPaid += payment;
      if (targetAfterLOC.balance <= 0.005) absorbed.add(targetAfterLOC.id);
    }

    const remainingBalanceByDebt: Record<string, number> = { [locId]: Math.max(0, locBalance) };
    for (const s of snapshots) remainingBalanceByDebt[s.id] = Math.max(0, s.balance);

    months.push({ month, interestByDebt, paymentByDebt, remainingBalanceByDebt });
  }

  const neverPaysOff =
    snapshots.some((s) => !absorbed.has(s.id) && s.balance > 0.005) || locBalance > 0.005;

  return {
    strategy: "velocityBanking",
    debtNames,
    months,
    totalInterestPaid,
    totalPaid,
    neverPaysOff,
  };
}
