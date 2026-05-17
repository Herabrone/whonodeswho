import { useRef, useState, useEffect } from "react";
import { useGraphStore } from "../../store/useGraphStore";

const CURRENT_YEAR = new Date().getFullYear();

function formatYear(year: number): string {
  return String(Math.floor(year));
}

function isNow(year: number): boolean {
  return Math.floor(year) >= CURRENT_YEAR;
}

export function TimelineDateChip() {
  const timelineYear = useGraphStore((s) => s.timelineYear);
  const relationships = useGraphStore((s) => s.relationships);
  const setTimelineYear = useGraphStore((s) => s.setTimelineYear);

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Earliest year from relationships for slider min
  const minYear = (() => {
    const years = relationships
      .map((r) => r.startYear)
      .filter((y): y is number => typeof y === "number");
    return years.length > 0 ? Math.min(...years) : CURRENT_YEAR - 10;
  })();
  const maxYear = CURRENT_YEAR + 1;

  // Sync input value when popover opens
  useEffect(() => {
    if (open) setInputValue(formatYear(timelineYear));
  }, [open, timelineYear]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const now = isNow(timelineYear);
  const displayLabel = now ? "Now" : formatYear(timelineYear);

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTimelineYear(Number(e.target.value));
  }

  function handleInputBlur() {
    const parsed = parseInt(inputValue, 10);
    if (!Number.isNaN(parsed)) {
      setTimelineYear(Math.max(minYear, Math.min(maxYear, parsed)));
    } else {
      setInputValue(formatYear(timelineYear));
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    if (e.key === "Escape") {
      setInputValue(formatYear(timelineYear));
      setOpen(false);
    }
  }

  function jumpToNow() {
    setTimelineYear(CURRENT_YEAR);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Timeline date: ${displayLabel}. Click to change.`}
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 12px",
          fontSize: "12px",
          fontWeight: 500,
          borderRadius: "var(--radii-lg, 12px)",
          background: "var(--rf-graph-control-bg)",
          border: now
            ? "1px solid var(--rf-accent)"
            : "1px solid var(--rf-graph-control-border)",
          backdropFilter: "blur(14px)",
          color: now ? "var(--rf-accent)" : "var(--rf-graph-control-text)",
          cursor: "pointer",
          transition: "opacity 150ms ease, border-color 150ms ease, color 150ms ease",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            opacity: 1,
            transition: "opacity 150ms ease",
          }}
        >
          {displayLabel}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          style={{ opacity: 0.5 }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            minWidth: 240,
            padding: "14px 16px",
            borderRadius: "var(--radii-lg, 12px)",
            background: "var(--rf-graph-control-bg)",
            border: "1px solid var(--rf-graph-control-border)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label
              style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--rf-graph-control-text)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Timeline year
            </label>
            <input
              type="range"
              min={minYear}
              max={maxYear}
              step={1}
              value={Math.floor(timelineYear)}
              onChange={handleSliderChange}
              style={{ width: "100%", cursor: "pointer" }}
              aria-label="Year slider"
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "var(--rf-graph-control-text)",
                opacity: 0.6,
                marginTop: 2,
              }}
            >
              <span>{minYear}</span>
              <span>{maxYear}</span>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--rf-graph-control-text)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Enter year
            </label>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              min={minYear}
              max={maxYear}
              style={{
                width: "100%",
                padding: "5px 8px",
                fontSize: 13,
                borderRadius: 6,
                border: "1px solid var(--rf-graph-control-border)",
                background: "var(--rf-bg-subtle, transparent)",
                color: "var(--rf-graph-control-text)",
                outline: "none",
                boxSizing: "border-box",
              }}
              aria-label="Year input"
            />
          </div>

          <button
            type="button"
            onClick={jumpToNow}
            style={{
              width: "100%",
              padding: "6px 0",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              border: "1px solid var(--rf-accent)",
              background: "transparent",
              color: "var(--rf-accent)",
              cursor: "pointer",
            }}
          >
            Jump to Now
          </button>
        </div>
      )}
    </div>
  );
}
