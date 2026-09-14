import { useState } from "react";
import CurrencyInput from "../components/CurrencyInput";
import Modal from "../components/Modal";
import {
  EXPENSE_CATEGORY_LABELS,
  MANUAL_EXPENSE_CATEGORIES,
  makeExpense,
  type Expense,
} from "../models/types";
import { useAppData } from "../store/AppDataContext";
import { asCurrency } from "../utils/format";

function ExpenseForm({ expense, onChange }: { expense: Expense; onChange: (e: Expense) => void }) {
  return (
    <div className="form-grid">
      <label>
        Name
        <input
          className="input"
          placeholder="e.g. Electric Bill"
          value={expense.name}
          onChange={(e) => onChange({ ...expense, name: e.target.value })}
        />
      </label>
      <label>
        Category
        <select
          className="input"
          value={expense.category}
          onChange={(e) => onChange({ ...expense, category: e.target.value as Expense["category"] })}
        >
          {MANUAL_EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Monthly Amount
        <CurrencyInput value={expense.monthlyAmount} onChange={(v) => onChange({ ...expense, monthlyAmount: v })} />
      </label>
      <label>
        Notes (optional)
        <input className="input" value={expense.notes} onChange={(e) => onChange({ ...expense, notes: e.target.value })} />
      </label>
    </div>
  );
}

export default function Expenses() {
  const { expenses, addExpense, updateExpense, removeExpense } = useAppData();
  const [draft, setDraft] = useState<Expense | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);

  const total = expenses.reduce((sum, e) => sum + e.monthlyAmount, 0);

  const grouped = MANUAL_EXPENSE_CATEGORIES.map((category) => ({
    category,
    items: expenses.filter((e) => e.category === category).sort((a, b) => b.monthlyAmount - a.monthlyAmount),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Expenses</h1>
        <button className="button button-primary" onClick={() => setDraft(makeExpense())}>
          + Add Expense
        </button>
      </div>

      {expenses.length > 0 && (
        <div className="card">
          <div className="total-row">
            <span>Total Monthly Expenses</span>
            <strong>{asCurrency(total)}</strong>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="card empty-state">
          <p>No expenses yet. Add your monthly bills — utilities, groceries, housing, subscriptions, and more.</p>
        </div>
      ) : (
        grouped.map((group) => (
          <div className="card" key={group.category}>
            <h2>{EXPENSE_CATEGORY_LABELS[group.category]}</h2>
            <ul className="list">
              {group.items.map((e) => (
                <li key={e.id} className="list-item" onClick={() => setEditing(e)}>
                  <div>
                    <div className="list-item-title">{e.name || "Untitled Expense"}</div>
                    {e.notes && <div className="list-item-subtitle">{e.notes}</div>}
                  </div>
                  <div className="list-item-value">{asCurrency(e.monthlyAmount)}</div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <p className="help-text">Debt minimum payments are tracked on the Debts page, not here.</p>

      {draft && (
        <Modal
          title="Add Expense"
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className="button button-secondary" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={!draft.name.trim()}
                onClick={() => {
                  addExpense(draft);
                  setDraft(null);
                }}
              >
                Save
              </button>
            </>
          }
        >
          <ExpenseForm expense={draft} onChange={setDraft} />
        </Modal>
      )}

      {editing && (
        <Modal
          title="Edit Expense"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button
                className="button button-danger"
                onClick={() => {
                  removeExpense(editing.id);
                  setEditing(null);
                }}
              >
                Delete
              </button>
              <button
                className="button button-primary"
                disabled={!editing.name.trim()}
                onClick={() => {
                  updateExpense(editing);
                  setEditing(null);
                }}
              >
                Done
              </button>
            </>
          }
        >
          <ExpenseForm expense={editing} onChange={setEditing} />
        </Modal>
      )}
    </div>
  );
}
