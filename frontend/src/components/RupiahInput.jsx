import React, { useState, useEffect } from "react";
import { formatRupiahDisplay, parseRupiahInput } from "../utils/currency";

export default function RupiahInput({
  value = "",
  onChange,
  placeholder = "0,00",
  className = "",
  focusColor = "emerald",
  required = false,
  disabled = false,
  allowZero = false,
  autoFocus = false,
  id,
  name
}) {
  const [displayValue, setDisplayValue] = useState(() =>
    formatRupiahDisplay(value, allowZero)
  );

  useEffect(() => {
    setDisplayValue(formatRupiahDisplay(value, allowZero));
  }, [value, allowZero]);

  const handleChange = (e) => {
    const rawDigits = parseRupiahInput(e.target.value, value);
    setDisplayValue(formatRupiahDisplay(rawDigits, allowZero));
    if (onChange) {
      onChange(rawDigits);
    }
  };

  const handleKeyDown = (e) => {
    // Prevent typing manual commas or dots so auto-formatting is not disrupted
    if (e.key === "," || e.key === ".") {
      e.preventDefault();
    }
  };

  const ringClass = focusColor === "blue" ? "focus:ring-blue-500" : "focus:ring-emerald-500";

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3.5 text-slate-400 font-bold text-sm pointer-events-none select-none">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full pl-11 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-base focus:outline-hidden focus:ring-2 ${ringClass} focus:bg-white transition ${className}`}
      />
    </div>
  );
}
