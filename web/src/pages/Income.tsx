import { useState } from "react";
import Modal from "../components/Modal";
import { makePaystub, monthlyNetPay, PAY_FREQUENCY_LABELS, type Paystub } from "../models/types";
import { useAppData } from "../store/AppDataContext";
import { asCurrency } from "../utils/format";
import IncomeForm from "./IncomeForm";

export default function Income() {
  const { paystubs, addPaystub, updatePaystub, removePaystub } = useAppData();
  const [draft, setDraft] = useState<Paystub | null>(null);
  const [editing, setEditing] = useState<Paystub | null>(null);

  const totalMonthlyNet = paystubs.reduce((sum, p) => sum + monthlyNetPay(p), 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Income</h1>
        <button className="button button-primary" onClick={() => setDraft(makePaystub({ employerName: "New Paystub" }))}>
          + Add Income
        </button>
      </div>

      {paystubs.length > 0 && (
        <div className="card">
          <div className="total-row">
            <span>Total Monthly Take-Home</span>
            <strong>{asCurrency(totalMonthlyNet)}</strong>
          </div>
        </div>
      )}

      {paystubs.length === 0 ? (
        <div className="card empty-state">
          <p>No income yet. Add a paystub to calculate your take-home pay, including overtime.</p>
        </div>
      ) : (
        <ul className="list">
          {paystubs.map((p) => (
            <li key={p.id} className="list-item" onClick={() => setEditing(p)}>
              <div>
                <div className="list-item-title">{p.employerName || "Untitled Income"}</div>
                <div className="list-item-subtitle">
                  {PAY_FREQUENCY_LABELS[p.payFrequency]}
                  {!p.isSalaried && p.overtimeHours > 0 && ` • ${p.overtimeHours} OT hrs/period`}
                </div>
              </div>
              <div className="list-item-value tone-good">{asCurrency(monthlyNetPay(p))} / mo</div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <Modal
          title="Add Income"
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className="button button-secondary" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  addPaystub(draft);
                  setDraft(null);
                }}
              >
                Save
              </button>
            </>
          }
        >
          <IncomeForm paystub={draft} onChange={setDraft} />
        </Modal>
      )}

      {editing && (
        <Modal
          title="Edit Income"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button
                className="button button-danger"
                onClick={() => {
                  removePaystub(editing.id);
                  setEditing(null);
                }}
              >
                Delete
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  updatePaystub(editing);
                  setEditing(null);
                }}
              >
                Done
              </button>
            </>
          }
        >
          <IncomeForm paystub={editing} onChange={setEditing} />
        </Modal>
      )}
    </div>
  );
}
