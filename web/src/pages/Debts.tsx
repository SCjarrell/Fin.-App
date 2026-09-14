import { useState } from "react";
import CurrencyInput from "../components/CurrencyInput";
import Modal from "../components/Modal";
import {
  DEBT_TYPES,
  DEBT_TYPE_LABELS,
  debtTypeHasCreditLimit,
  makeDebt,
  type Debt,
} from "../models/types";
import { useAppData } from "../store/AppDataContext";
import { asCurrency, asPercent } from "../utils/format";

function DebtForm({ debt, onChange }: { debt: Debt; onChange: (d: Debt) => void }) {
  return (
    <div className="form-grid">
      <label>
        Name
        <input
          className="input"
          placeholder="e.g. Chase Sapphire"
          value={debt.name}
          onChange={(e) => onChange({ ...debt, name: e.target.value })}
        />
      </label>
      <label>
        Type
        <select
          className="input"
          value={debt.type}
          onChange={(e) => onChange({ ...debt, type: e.target.value as Debt["type"] })}
        >
          {DEBT_TYPES.map((t) => (
            <option key={t} value={t}>
              {DEBT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Current Balance
        <CurrencyInput value={debt.balance} onChange={(v) => onChange({ ...debt, balance: v })} />
      </label>
      <label>
        Minimum Monthly Payment
        <CurrencyInput value={debt.minimumPayment} onChange={(v) => onChange({ ...debt, minimumPayment: v })} />
      </label>
      <label>
        Interest Rate (APR %)
        <CurrencyInput
          value={Math.round(debt.apr * 100 * 1e6) / 1e6}
          onChange={(v) => onChange({ ...debt, apr: Math.round((v / 100) * 1e8) / 1e8 })}
        />
      </label>

      {debtTypeHasCreditLimit(debt.type) && (
        <>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={debt.creditLimit !== null}
              onChange={(e) => onChange({ ...debt, creditLimit: e.target.checked ? debt.balance : null })}
            />
            Has a Credit Limit
          </label>
          {debt.creditLimit !== null && (
            <label>
              Credit Limit
              <CurrencyInput value={debt.creditLimit} onChange={(v) => onChange({ ...debt, creditLimit: v })} />
            </label>
          )}
          <p className="help-text">Used to estimate available room for a velocity banking strategy.</p>
        </>
      )}
    </div>
  );
}

export default function Debts() {
  const { debts, addDebt, updateDebt, removeDebt } = useAppData();
  const [draft, setDraft] = useState<Debt | null>(null);
  const [editing, setEditing] = useState<Debt | null>(null);

  const totalBalance = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinimums = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const blendedAPR = totalBalance > 0 ? debts.reduce((sum, d) => sum + d.balance * d.apr, 0) / totalBalance : 0;

  const sorted = [...debts].sort((a, b) => b.apr - a.apr);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Debts</h1>
        <button className="button button-primary" onClick={() => setDraft(makeDebt())}>
          + Add Debt
        </button>
      </div>

      {debts.length > 0 && (
        <div className="card">
          <div className="total-row">
            <span>Total Debt</span>
            <strong>{asCurrency(totalBalance)}</strong>
          </div>
          <div className="total-row">
            <span>Total Minimum Payments / mo</span>
            <strong>{asCurrency(totalMinimums)}</strong>
          </div>
          <div className="total-row">
            <span>Blended APR</span>
            <strong>{asPercent(blendedAPR)}</strong>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <div className="card empty-state">
          <p>No debts tracked. Add every credit card, loan, and line of credit to unlock payoff strategies.</p>
        </div>
      ) : (
        <ul className="list">
          {sorted.map((d) => (
            <li key={d.id} className="list-item" onClick={() => setEditing(d)}>
              <div>
                <div className="list-item-title">{d.name || DEBT_TYPE_LABELS[d.type]}</div>
                <div className="list-item-subtitle">
                  {DEBT_TYPE_LABELS[d.type]} • {asPercent(d.apr)} APR
                </div>
              </div>
              <div className="list-item-trailing">
                <div className="list-item-value">{asCurrency(d.balance)}</div>
                <div className="list-item-subtitle">min {asCurrency(d.minimumPayment)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <Modal
          title="Add Debt"
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
                  addDebt(draft);
                  setDraft(null);
                }}
              >
                Save
              </button>
            </>
          }
        >
          <DebtForm debt={draft} onChange={setDraft} />
        </Modal>
      )}

      {editing && (
        <Modal
          title="Edit Debt"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button
                className="button button-danger"
                onClick={() => {
                  removeDebt(editing.id);
                  setEditing(null);
                }}
              >
                Delete
              </button>
              <button
                className="button button-primary"
                disabled={!editing.name.trim()}
                onClick={() => {
                  updateDebt(editing);
                  setEditing(null);
                }}
              >
                Done
              </button>
            </>
          }
        >
          <DebtForm debt={editing} onChange={setEditing} />
        </Modal>
      )}
    </div>
  );
}
