import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link, Navigate, useParams } from "react-router-dom";
import { summarizeBudget } from "../engine/budgetCalculator";
import { simulateAvalanche, simulateSnowball, simulateVelocityBanking } from "../engine/debtPayoffEngine";
import {
  PAYOFF_STRATEGY_LABELS,
  monthTotalInterest,
  monthTotalPayment,
  monthTotalRemainingBalance,
  monthsToPayoff,
  payoffMonthByDebt,
  type PayoffStrategy,
} from "../engine/payoffStrategy";
import { useAppData } from "../store/AppDataContext";
import { asCurrency, asCurrencyWhole } from "../utils/format";

const DEBT_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#ef4444"];

export default function StrategyDetail() {
  const { strategy } = useParams<{ strategy: PayoffStrategy }>();
  const { paystubs, expenses, debts } = useAppData();
  const summary = summarizeBudget(paystubs, expenses, debts);
  const [locAPR] = useState(10);
  const [locLimit] = useState(() => Math.max(5000, debts.reduce((sum, d) => sum + d.balance, 0)));

  const result = useMemo(() => {
    const extra = Math.max(0, summary.cashFlow);
    if (strategy === "avalanche") return simulateAvalanche(debts, extra);
    if (strategy === "snowball") return simulateSnowball(debts, extra);
    if (strategy === "velocityBanking") {
      const existingLOC = debts.find((d) => d.type === "lineOfCredit");
      const apr = existingLOC && existingLOC.apr > 0 ? existingLOC.apr : locAPR / 100;
      return simulateVelocityBanking(debts, extra, {
        lineOfCreditAPR: apr,
        lineOfCreditLimit: existingLOC?.creditLimit ?? locLimit,
      });
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy, debts, summary.cashFlow]);

  if (!strategy || !result) {
    return <Navigate to="/strategies" replace />;
  }

  const debtIds = Object.keys(result.debtNames).sort((a, b) =>
    (result.debtNames[a] ?? "").localeCompare(result.debtNames[b] ?? "")
  );

  const chartData = result.months.map((m) => {
    const row: Record<string, number> = { month: m.month };
    for (const id of debtIds) row[id] = m.remainingBalanceByDebt[id] ?? 0;
    return row;
  });

  const debtFreeDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToPayoff(result));
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();

  const order = Object.entries(payoffMonthByDebt(result)).sort((a, b) => a[1] - b[1]);

  return (
    <div className="page">
      <Link to="/strategies" className="back-link">
        ← Strategies
      </Link>
      <h1>{PAYOFF_STRATEGY_LABELS[strategy]}</h1>

      <div className="card">
        <div className="total-row">
          <span>Debt-Free Date</span>
          <strong>{result.months.length > 0 ? debtFreeDate : "—"}</strong>
        </div>
        <div className="total-row">
          <span>Months to Payoff</span>
          <strong>{monthsToPayoff(result)}</strong>
        </div>
        <div className="total-row">
          <span>Total Paid</span>
          <strong>{asCurrency(result.totalPaid)}</strong>
        </div>
        <div className="total-row">
          <span>Total Interest Paid</span>
          <strong>{asCurrency(result.totalInterestPaid)}</strong>
        </div>
      </div>

      {result.neverPaysOff && (
        <div className="card">
          <p className="warning-text">
            ⚠️ At this payment level, interest accrues faster than it's paid down. Increase your extra monthly
            payment on the Strategies page.
          </p>
        </div>
      )}

      {result.months.length > 0 && (
        <>
          <div className="card">
            <h2>Balance Over Time</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => asCurrencyWhole(v)} width={80} />
                <Tooltip formatter={(value) => asCurrency(Number(value))} labelFormatter={(m) => `Month ${m}`} />
                {debtIds.map((id, i) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={result.debtNames[id]}
                    stroke={DEBT_COLORS[i % DEBT_COLORS.length]}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2>Payoff Order</h2>
            <ul className="list">
              {order.map(([id, month]) => (
                <li key={id} className="list-item list-item-static">
                  <span>{result.debtNames[id]}</span>
                  <span className="stat-subtitle">Month {month}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Monthly Schedule</h2>
            <ul className="list schedule-list">
              {result.months.map((m) => (
                <li key={m.month} className="list-item-static schedule-row">
                  <div className="schedule-row-top">
                    <strong>Month {m.month}</strong>
                    <span className="stat-subtitle">Balance: {asCurrencyWhole(monthTotalRemainingBalance(m))}</span>
                  </div>
                  <div className="stat-subtitle">
                    Paid {asCurrency(monthTotalPayment(m))} • Interest {asCurrency(monthTotalInterest(m))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
