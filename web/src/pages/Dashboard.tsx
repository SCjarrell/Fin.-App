import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import StatCard from "../components/StatCard";
import { summarizeBudget } from "../engine/budgetCalculator";
import { EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "../models/types";
import { useAppData } from "../store/AppDataContext";
import { asCurrency, asCurrencyWhole } from "../utils/format";

export default function Dashboard() {
  const { paystubs, expenses, debts } = useAppData();
  const summary = summarizeBudget(paystubs, expenses, debts);

  const categoryData = (Object.entries(summary.expenseByCategory) as [ExpenseCategory, number][])
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      label: EXPENSE_CATEGORY_LABELS[category],
      amount,
      color: EXPENSE_CATEGORY_COLORS[category],
    }));

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div className="page">
      <h1>Dashboard</h1>

      <div className={`card cashflow-card ${summary.isRunningDeficit ? "cashflow-bad" : "cashflow-good"}`}>
        <div className="cashflow-label">Monthly Cash Flow</div>
        <div className="cashflow-value">{asCurrency(summary.cashFlow)}</div>
        <div className="cashflow-breakdown">
          <div>
            <div className="stat-subtitle">Net Income</div>
            <div className="cashflow-part">{asCurrency(summary.totalNetIncome)}</div>
          </div>
          <div className="cashflow-minus">−</div>
          <div>
            <div className="stat-subtitle">Expenses</div>
            <div className="cashflow-part">{asCurrency(summary.totalExpenses)}</div>
          </div>
        </div>
        {summary.isRunningDeficit && (
          <p className="warning-text">⚠️ You're spending more than you bring home this month.</p>
        )}
      </div>

      <div className="stat-grid">
        <StatCard title="Gross Income / mo" value={asCurrency(summary.totalGrossIncome)} tone="good" />
        <StatCard title="Taxes Paid / mo" value={asCurrency(summary.totalTaxes)} tone="warn" />
        <StatCard title="Pretax Deductions / mo" value={asCurrency(summary.totalPretaxDeductions)} />
        <StatCard title="Post-Tax Deductions / mo" value={asCurrency(summary.totalPostTaxDeductions)} />
        <StatCard
          title="Debt Interest / mo"
          value={asCurrency(summary.totalMonthlyDebtInterest)}
          subtitle="at minimum-payment pace"
          tone="bad"
        />
        <StatCard title="Total Debt" value={asCurrency(totalDebt)} tone="bad" />
      </div>

      {categoryData.length > 0 ? (
        <div className="card">
          <h2>Spending by Category</h2>
          <ResponsiveContainer width="100%" height={Math.max(160, categoryData.length * 40)}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 24, right: 24 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 13 }} />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                {categoryData.map((entry) => (
                  <Cell key={entry.category} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ul className="legend-list">
            {categoryData.map((entry) => (
              <li key={entry.category}>
                <span className="legend-dot" style={{ background: entry.color }} />
                {entry.label}
                <strong>{asCurrencyWhole(entry.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card empty-state">
          <p>No expenses yet. Add income, expenses, and debts to see your full financial picture.</p>
        </div>
      )}

      <Link to="/strategies" className="button button-primary button-block">
        🚀 Compare Debt Payoff Strategies
      </Link>
    </div>
  );
}
