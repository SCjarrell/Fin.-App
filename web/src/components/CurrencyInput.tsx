import { useEffect, useRef, useState } from "react";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  id?: string;
}

/** Rounds away binary floating-point noise (e.g. 0.07 * 100 -> 7.000000000000001) and
 * renders a bare zero as an empty field so a fresh "0" doesn't sit in front of what's typed. */
function formatForDisplay(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(Math.round(value * 1e6) / 1e6);
}

/**
 * A numeric text field that owns its own display text instead of re-deriving it from `value`
 * on every keystroke. Two problems this avoids:
 *  - Native `<input type="number">` inserts typed digits at the cursor, so typing into a field
 *    showing "0" produces "05" until the field is blurred.
 *  - A controlled numeric input whose value round-trips through unrelated math (e.g. a percent
 *    converted to a decimal and back) can pick up floating-point noise like 7.000000000000001,
 *    which then renders literally.
 */
export default function CurrencyInput({ value, onChange, placeholder, id }: CurrencyInputProps) {
  const [text, setText] = useState(() => formatForDisplay(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setText(formatForDisplay(value));
    }
  }, [value]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      className="input"
      value={text}
      placeholder={placeholder ?? "0"}
      onFocus={(e) => {
        isFocused.current = true;
        e.target.select();
      }}
      onBlur={() => {
        isFocused.current = false;
        setText(formatForDisplay(value));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        // Allow only what a partially-typed decimal number looks like; reject anything else
        // (letters, multiple decimal points, ...) by simply not updating.
        if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
        setText(raw);
        const parsed = parseFloat(raw);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
    />
  );
}
