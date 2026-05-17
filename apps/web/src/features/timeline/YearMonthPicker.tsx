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
  endYear?: number;
  isEnded?: boolean;
  onYearChange: (year?: number) => void;
  onMonthChange: (month?: number) => void;
  onEndedChange?: (ended: boolean) => void;
  onEndYearChange?: (year?: number) => void;
}

export function YearMonthPicker({
  startYear,
  startMonth,
  endYear,
  isEnded = false,
  onYearChange,
  onMonthChange,
  onEndedChange,
  onEndYearChange,
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

      {onEndedChange ? (
        <div className="sm:col-span-2 rounded-lg border border-rf-border bg-rf-subtle p-3">
          <div className="text-sm font-medium text-rf-text">Relationship status</div>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-rf-border bg-rf-base p-1">
            <button
              type="button"
              onClick={() => {
                onEndedChange(false);
                onEndYearChange?.(undefined);
              }}
              className={`rounded px-3 py-1 text-xs ${
                !isEnded ? "bg-rf-accent text-white" : "text-rf-text"
              }`}
            >
              Ongoing
            </button>
            <button
              type="button"
              onClick={() => {
                onEndedChange(true);
                if (!endYear) onEndYearChange?.(currentYear);
              }}
              className={`rounded px-3 py-1 text-xs ${
                isEnded ? "bg-rf-accent text-white" : "text-rf-text"
              }`}
            >
              Ended
            </button>
          </div>

          {isEnded ? (
            <label className="mt-3 block text-sm text-rf-text">
              Year ended
              <select
                value={endYear ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  onEndYearChange?.(value ? Number(value) : undefined);
                }}
                className="mt-1 w-full rounded-lg border border-rf-border bg-rf-base px-3 py-2 text-sm text-rf-text"
              >
                <option value="">Optional</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
