import React from "react";

export type DatePrecision = "year" | "month" | "day";

interface TransitionDatePickerProps {
  year: number;
  month: number;
  day: number;
  precision: DatePrecision;
  min: number;
  max: number;
  onDateChange: (year: number, month: number, day: number) => void;
  onPrecisionChange: (precision: DatePrecision) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function TransitionDatePicker({
  year,
  month,
  day,
  precision,
  min,
  max,
  onDateChange,
  onPrecisionChange
}: TransitionDatePickerProps) {
  
  const handleYearChange = (newYear: number) => {
    onDateChange(newYear, month, day);
  };

  const handleMonthChange = (newMonth: number) => {
    onDateChange(year, newMonth, day);
  };

  const handleDayChange = (newDay: number) => {
    onDateChange(year, month, newDay);
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const date = new Date(e.target.value);
    onDateChange(date.getFullYear(), date.getMonth() + 1, date.getDate());
  };

  // Construct ISO string for native date input (YYYY-MM-DD)
  const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Precision Toggles */}
      <div style={{ 
        display: "flex", 
        background: "var(--rf-bg-subtle, #f3f4f6)", 
        borderRadius: 8, 
        padding: 4,
        gap: 4
      }}>
        {(["year", "month", "day"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPrecisionChange(p)}
            style={{
              flex: 1,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: precision === p ? "white" : "transparent",
              color: precision === p ? "black" : "var(--rf-text-secondary, #6b7280)",
              boxShadow: precision === p ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s"
            }}
          >
            {p === "year" ? "Year" : p === "month" ? "Month & Year" : "Exact Date"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {precision === "year" && (
          <label style={labelStyle}>
            <span style={spanStyle}>Year</span>
            <input
              type="number"
              min={min}
              max={max}
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              style={inputStyle}
            />
          </label>
        )}

        {precision === "month" && (
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ ...labelStyle, flex: 2 }}>
              <span style={spanStyle}>Month</span>
              <select
                value={month}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                style={inputStyle}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </label>
            <label style={{ ...labelStyle, flex: 1 }}>
              <span style={spanStyle}>Year</span>
              <input
                type="number"
                min={min}
                max={max}
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                style={inputStyle}
              />
            </label>
          </div>
        )}

        {precision === "day" && (
          <label style={labelStyle}>
            <span style={spanStyle}>Exact Date</span>
            <input
              type="date"
              value={isoDate}
              onChange={handleNativeDateChange}
              style={inputStyle}
            />
          </label>
        )}
      </div>

      <p style={{ fontSize: 12, color: "var(--rf-text-secondary, var(--rf-muted))", margin: 0 }}>
        The closing episode will end on {year}
        {precision !== "year" && `-${month.toString().padStart(2, '0')}`}
        {precision === "day" && `-${day.toString().padStart(2, '0')}`} and any new episode will begin on the same date.
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "var(--rf-text-primary, var(--rf-text))",
};

const spanStyle: React.CSSProperties = {
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 14,
  borderRadius: 8,
  border: "1px solid var(--rf-border-default, #d1d5db)",
  background: "var(--rf-bg-subtle, transparent)",
  color: "var(--rf-text-primary, var(--rf-text))",
  outline: "none",
};

