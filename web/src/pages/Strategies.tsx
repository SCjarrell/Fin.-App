import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { summarizeBudget } from "../engine/budgetCalculator";
import { simulateAvalanche, simulateSnowball, simulateVelocityBanking } from "../engine/debtPayoffEngine";
import {
  PAYOFF_STRATEGY_LABELS,
  PAYOFF_STRATEGY_SUMMARIES,
  monthTotalRemainingBalance,
  monthsToPayoff,
  yearsAndMonthsToPayoff,
  type PayoffPlanResult,
} from "../engine/payoffStrategy";
import { useAppData } from "../store/AppDataContext";
import { asCurrency, asCurrencyWhole } from "../utils/format";

const STRATEGY_COLORS: Record<string, string> = {
  avalanche: "#3b82f6",
  snowball: "#22c55e",
  velocityBanking: "#a855f7",
};

export default function Strategies() {
  const { paystubs, expenses, debts } = useAppData();
  const summary = summarizeBudget(paystubs, expenses, debts);

  const existingLOC = debts.find((d) => d.type === "lineOfCredit");

  const [extraPayment, setExtraPayment] = useState<number | null>(null);
  const [locAPR, setLocAPR] = useState<number>(() => (existingLOC && existingLOC.apr > 0 ? existingLOC.apr * 100 : 10));
  const [locLimit, setLocLimit] = useState<number | null>(
    () => existingLOC?.creditLimit ?? null
  );

  const effectiveExtraPayment = extraPayment ?? Math.max(0, summary.cashFlow);
  const effectiveLocLimit =
    locLimit ?? Math.max(5000, debts.reduce((sum, d) => sum + d.balance, 0));
  const effectiveLocAPR = locAPR;

  const results: PayoffPlanResult[] = useMemo(() => {
    if (debts.length === 0) return [];
    return [
      simulateAvalanche(debts, effectiveExtraPayment),
      simulateSnowball(debts, effectiveExtraPayment),
      simulateVelocityBanking(debts, effectiveExtraPayment, {
        lineOfCreditAPR: effectiveLocAPR / 100,
        lineOfCreditLimit: effectiveLocLimit,
      }),
    ];
  }, [debts, effectiveExtraPayment, effectiveLocAPR, effectiveLocLimit]);

  const solved = results.filter((r) => !r.neverPaysOff);
  const fastest = solved.length
    ? solved.reduce((a, b) => (monthsToPayoff(a) <= monthsToPayoff(b) ? a : b)).strategy
    : null;
  const cheapest = solved.length
    ? solved.reduce((a, b) => (a.totalInterestPaid <= b.totalInterestPaid ? a : b)).strategy
    : null;

  const maxMonth = Math.max(0, ...results.map((r) => r.months.length));
  const chartData = Array.from({ length: maxMonth }, (_, i) => {
    const month = i + 1;
    const row: Record<string, number> = { month };
    for (const r of results) {
      const entry = r.months[i];
      row[r.strategy] = entry ? monthTotalRemainingBalance(entry) : 0;
    }
    return row;
  });

  if (debts.length === 0) {
    return (
      <div className="page">
        <h1>Payoff Strategies</h1>
        <div className="card empty-state">
          <p>Add debts to compare strategies. Once your debts are entered, you'll see avalanche, snowball, and velocity banking side by side.</p>
          <Link to="/debts" className="button button-primary">
            Go to Debts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Payoff Strategies</h1>

      <div className="card">
        <h2>Extra Monthly Payment</h2>
        <p className="help-text">
          Your current monthly cash flow is {asCurrency(summary.cashFlow)}. This is how much extra you can put toward
          debt beyond the minimums.
        </p>
        <div className="row-inline">
          <span>$</span>
          <input
            className="input"
            type="number"
            value={Math.round(effectiveExtraPayment)}
            onChange={(e) => setExtraPayment(e.target.valueAsNumber || 0)}
          />
        </div>
      </div>

      <div className="card">
        <h2>Velocity Banking Assumptions</h2>
        <p className="help-text">Velocity banking needs a line of credit to cycle debt through.</p>
        <div className="row-inline">
          <label>
            APR %
            <input
              className="input"
              type="number"
              step="0.01"
              value={effectiveLocAPR}
              onChange={(e) => setLocAPR(e.target.valueAsNumber || 0)}
            />
          </label>
          <label>
            Credit Limit $
            <input
              className="input"
              type="number"
              value={Math.round(effectiveLocLimit)}
              onChange={(e) => setLocLimit(e.target.valueAsNumber || 0)}
            />
          </label>
        </div>
      </div>

      {solved.length > 0 && (
        <div className="card">
          <h2>Total Debt Remaining Over Time</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} label={{ value: "Months", position: "insideBottom", offset: -5 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => asCurrencyWhole(v)} width={80} />
              <Tooltip formatter={(value) => asCurrency(Number(value))} labelFormatter={(m) => `Month ${m}`} />
              {results.map((r) => (
                <Line
                  key={r.strategy}
                  type="monotone"
                  dataKey={r.strategy}
                  name={PAYOFF_STRATEGY_LABELS[r.strategy]}
                  stroke={STRATEGY_COLORS[r.strategy]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {results.map((result) => (
        <Link to={`/strategies/${result.strategy}`} key={result.strategy} className="card strategy-card">
          <div className="strategy-card-header">
            <h2>{PAYOFF_STRATEGY_LABELS[result.strategy]}</h2>
            <div className="badges">
              {fastest === result.strategy && <span className="badge badge-blue">Fastest</span>}
              {cheapest === result.strategy && <span className="badge badge-green">Least Interest</span>}
            </div>
          </div>
          <p className="help-text">{PAYOFF_STRATEGY_SUMMARIES[result.strategy]}</p>
          {result.neverPaysOff ? (
            <p className="warning-text">
              ⚠️ Minimum payments don't cover interest — increase your extra payment.
            </p>
          ) : (
            <div className="strategy-card-stats">
              <div>
                <div className="stat-subtitle">Debt-Free In</div>
                <div className="stat-value">
                  {(() => {
                    const { years, months } = yearsAndMonthsToPayoff(result);
                    return years > 0 ? `${years}y ${months}m` : `${months}m`;
                  })()}
                </div>
              </div>
              <div>
                <div className="stat-subtitle">Total Interest</div>
                <div className="stat-value">{asCurrencyWhole(result.totalInterestPaid)}</div>
              </div>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
