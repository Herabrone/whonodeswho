const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface YearMonthPickerProps {
  startYear?: number;
  startMonth?: number;
  onYearChange: (year?: number) => void;
  onMonthChange: (month?: number) => void;
}

export function YearMonthPicker({
  startYear,
  startMonth,
  onYearChange,
  onMonthChange,
}: YearMonthPickerProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 81 }, (_, index) => currentYear - index);

  return (
    <>
      <label className="text-sm text-rf-text">
        Year started
        <select
          value={startYear ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            onYearChange(value ? Number(value) : undefined);
            if (!value) onMonthChange(undefined);
          }}
          className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
        >
          <option value="">Optional</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-rf-text">
        Month {startYear ? <span className="text-rf-muted">(optional - anniversary reminders)</span> : null}
        <select
          value={startMonth ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            onMonthChange(value ? Number(value) : undefined);
          }}
          disabled={!startYear}
          className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Optional</option>
          {MONTHS.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
