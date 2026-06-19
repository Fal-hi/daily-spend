import { useState, useEffect } from "react";
import { Input } from "./input";

interface CurrencyInputProps {
  value: string;
  onChange: (rawValue: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function formatDisplayValue(raw: string): string {
  if (!raw) return "";
  const num = raw.replace(/[^0-9]/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  id,
  disabled,
  onKeyDown,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(formatDisplayValue(value));

  useEffect(() => {
    setDisplay(formatDisplayValue(value));
  }, [value]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputVal = e.target.value;
    const raw = inputVal.replace(/[^0-9]/g, "");
    setDisplay(formatDisplayValue(raw));
    onChange(raw);
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      onKeyDown={onKeyDown}
    />
  );
}
