interface TransitionDatePickerProps {
  value: number; // integer year
  min: number;
  max: number;
  onChange: (year: number) => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export function TransitionDatePicker({ value, min, max, onChange }: TransitionDatePickerProps) {
  const years = Array.from({ length: max - min + 1 }, (_, i) => max - i);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 13,
          color: "var(--rf-text-primary, var(--rf-text))",
        }}
      >
        <span style={{ fontWeight: 500 }}>Year</span>
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            padding: "8px 10px",
            fontSize: 14,
            borderRadius: 8,
            border: "1px solid var(--rf-border-default, var(--rf-graph-control-border))",
            background: "var(--rf-bg-subtle, transparent)",
            color: "var(--rf-text-primary, var(--rf-text))",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y === CURRENT_YEAR ? `${y} (this year)` : y}
            </option>
          ))}
        </select>
      </label>

      <p style={{ fontSize: 12, color: "var(--rf-text-secondary, var(--rf-muted))", margin: 0 }}>
        The closing episode will end on {value}‑01‑01 and any new episode will begin on the same date.
      </p>
    </div>
  );
}
