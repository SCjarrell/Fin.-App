interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  id?: string;
}

/** A plain numeric input bound to a number value (dollars, hours, whatever the caller means). */
export default function CurrencyInput({ value, onChange, placeholder, id }: CurrencyInputProps) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step="0.01"
      className="input"
      value={Number.isFinite(value) ? value : 0}
      placeholder={placeholder}
      onChange={(e) => {
        const next = e.target.valueAsNumber;
        onChange(Number.isNaN(next) ? 0 : next);
      }}
    />
  );
}
