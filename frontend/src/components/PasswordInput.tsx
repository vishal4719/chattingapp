import { useState } from "react";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
}

export function PasswordInput({
  id,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  placeholder,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-lg bg-[var(--wa-input)] px-4 py-2.5 pr-11 text-[var(--wa-text)] focus:outline-none focus:ring-1 focus:ring-[var(--wa-green)]"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--wa-text-secondary)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover)]"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 6.5c3.79 0 7.17 2.13 8.82 5.5-1.65 3.37-5.03 5.5-8.82 5.5S4.83 15.37 3.18 12C4.83 8.63 8.21 6.5 12 6.5m0-2C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 5a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1 0-5m0 2a.5.5 0 0 0 0 1 .5.5 0 0 0 0-1z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 10.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0-2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
