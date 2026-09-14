import { useState } from "react";
import CurrencyInput from "../components/CurrencyInput";
import {
  PAY_FREQUENCIES,
  PAY_FREQUENCY_LABELS,
  type DeductionItem,
  type Paystub,
  type TaxWithholding,
  grossPay,
  monthlyGrossPay,
  monthlyNetPay,
  netPay,
  overtimePay,
  overtimeRate,
} from "../models/types";
import { asCurrency } from "../utils/format";

interface IncomeFormProps {
  paystub: Paystub;
  onChange: (next: Paystub) => void;
}

function DeductionRows({
  title,
  helpText,
  items,
  onChange,
}: {
  title: string;
  helpText: string;
  items: DeductionItem[];
  onChange: (items: DeductionItem[]) => void;
}) {
  return (
    <fieldset className="fieldset">
      <legend>{title}</legend>
      <p className="help-text">{helpText}</p>
      {items.map((item, index) => (
        <div className="row-inline" key={item.id}>
          <input
            className="input"
            placeholder="Name"
            value={item.name}
            onChange={(e) => {
              const next = [...items];
              next[index] = { ...item, name: e.target.value };
              onChange(next);
            }}
          />
          <CurrencyInput
            value={item.amountPerPaycheck}
            onChange={(amount) => {
              const next = [...items];
              next[index] = { ...item, amountPerPaycheck: amount };
              onChange(next);
            }}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove ${title} row`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-secondary"
        onClick={() => onChange([...items, { id: crypto.randomUUID(), name: "", amountPerPaycheck: 0 }])}
      >
        + Add Item
      </button>
    </fieldset>
  );
}

export default function IncomeForm({ paystub, onChange }: IncomeFormProps) {
  const [p, setP] = useState(paystub);

  function update(patch: Partial<Paystub>) {
    const next = { ...p, ...patch };
    setP(next);
    onChange(next);
  }

  return (
    <div className="form-grid">
      <label>
        Employer / Source Name
        <input
          className="input"
          value={p.employerName}
          onChange={(e) => update({ employerName: e.target.value })}
        />
      </label>

      <label>
        Pay Frequency
        <select
          className="input"
          value={p.payFrequency}
          onChange={(e) => update({ payFrequency: e.target.value as Paystub["payFrequency"] })}
        >
          {PAY_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {PAY_FREQUENCY_LABELS[f]}
            </option>
          ))}
        </select>
      </label>

      <label className="checkbox-label">
        <input type="checkbox" checked={p.isSalaried} onChange={(e) => update({ isSalaried: e.target.checked })} />
        Salaried
      </label>

      {p.isSalaried ? (
        <label>
          Salary per Paycheck
          <CurrencyInput value={p.salaryPerPaycheck} onChange={(v) => update({ salaryPerPaycheck: v })} />
        </label>
      ) : (
        <>
          <label>
            Base Hourly Rate
            <CurrencyInput value={p.hourlyRate} onChange={(v) => update({ hourlyRate: v })} />
          </label>
          <label>
            Regular Hours per Period
            <CurrencyInput value={p.regularHours} onChange={(v) => update({ regularHours: v })} />
          </label>
          <label>
            Overtime Hours per Period
            <CurrencyInput value={p.overtimeHours} onChange={(v) => update({ overtimeHours: v })} />
          </label>
          {p.overtimeHours > 0 && (
            <div className="readout-row">
              <span>Overtime Rate (1.5x): {asCurrency(overtimeRate(p))}</span>
              <span>Overtime Pay: {asCurrency(overtimePay(p))}</span>
            </div>
          )}
        </>
      )}

      <label>
        Bonus / Commission / Tips
        <CurrencyInput value={p.otherGrossPay} onChange={(v) => update({ otherGrossPay: v })} />
      </label>

      <div className="readout-block">
        <div>
          Gross Pay per Paycheck <strong>{asCurrency(grossPay(p))}</strong>
        </div>
        <div>
          Gross Pay per Month <strong>{asCurrency(monthlyGrossPay(p))}</strong>
        </div>
      </div>

      <DeductionRows
        title="Pretax Deductions"
        helpText="401(k), health insurance, HSA/FSA, and other deductions taken before taxes."
        items={p.pretaxDeductions}
        onChange={(items) => update({ pretaxDeductions: items })}
      />

      <DeductionRows
        title="Taxes Withheld"
        helpText="Federal, state, local, Social Security, Medicare — as itemized on the paystub."
        items={p.taxes}
        onChange={(items) => update({ taxes: items as TaxWithholding[] })}
      />

      <DeductionRows
        title="Post-Tax Deductions"
        helpText="Roth contributions, union dues, wage garnishments, and other after-tax deductions."
        items={p.postTaxDeductions}
        onChange={(items) => update({ postTaxDeductions: items })}
      />

      <div className="readout-block readout-highlight">
        <div>
          Net Pay per Paycheck <strong>{asCurrency(netPay(p))}</strong>
        </div>
        <div>
          Net Pay per Month <strong>{asCurrency(monthlyNetPay(p))}</strong>
        </div>
      </div>
    </div>
  );
}
