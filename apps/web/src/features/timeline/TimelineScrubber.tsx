import { useMemo } from "react";
import { CATEGORY_COLORS } from "../../constants";
import { useGraphStore } from "../../store/useGraphStore";

interface TimelineScrubberProps {
  minYear: number;
  maxYear: number;
}

function toPercent(year: number, minYear: number, maxYear: number) {
  return `${((year - minYear) / (maxYear - minYear)) * 100}%`;
}

export function TimelineScrubber({ minYear, maxYear }: TimelineScrubberProps) {
  const relationships = useGraphStore((s) => s.relationships);
  const people = useGraphStore((s) => s.people);
  const timelinePlaying = useGraphStore((s) => s.timelinePlaying);
  const timelineSpeed = useGraphStore((s) => s.timelineSpeed);
  const timelineYear = useGraphStore((s) => s.timelineYear);
  const setTimelineYear = useGraphStore((s) => s.setTimelineYear);
  const setTimelinePlaying = useGraphStore((s) => s.setTimelinePlaying);
  const setTimelineSpeed = useGraphStore((s) => s.setTimelineSpeed);
  const closeTimeline = useGraphStore((s) => s.closeTimeline);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const events = relationships.filter((relationship) => relationship.startYear !== undefined);

  return (
    <div className="flex items-center gap-3 pt-4">
      <button
        type="button"
        onClick={() => setTimelinePlaying(!timelinePlaying)}
        className="rounded-full border border-line bg-canvas px-2.5 py-1 text-sm text-ink hover:bg-panel"
      >
        {timelinePlaying ? "Pause" : "Play"}
      </button>

      <div className="relative flex-1 pt-3">
        <input
          type="range"
          min={minYear}
          max={maxYear}
          step={0.02}
          value={timelineYear}
          onChange={(event) => setTimelineYear(Number(event.target.value))}
          className="w-full"
          style={{ accentColor: "#7c3aed" }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3">
          {events.map((relationship) => {
            const personName =
              peopleById.get(relationship.target)?.name ??
              peopleById.get(relationship.source)?.name ??
              "Unknown";
            return (
              <span
                key={relationship.id}
                title={`${relationship.startYear} - ${personName} (${relationship.type})`}
                style={{
                  position: "absolute",
                  left: toPercent(relationship.startYear!, minYear, maxYear),
                  top: 0,
                  width: 8,
                  height: 8,
                  transform: "translate(-50%, 0)",
                  borderRadius: "999px",
                  backgroundColor: CATEGORY_COLORS[relationship.category],
                  boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
                }}
              />
            );
          })}
        </div>
      </div>

      <span className="w-14 text-center font-mono text-sm text-ink">
        {Math.floor(timelineYear)}
      </span>

      <div className="flex items-center rounded-full border border-line bg-canvas p-0.5 text-xs">
        {[1, 2, 3].map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => setTimelineSpeed(speed as 1 | 2 | 3)}
            className={`rounded-full px-2 py-1 ${
              timelineSpeed === speed ? "bg-accent text-white" : "text-ink hover:bg-panel"
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={closeTimeline}
        className="rounded-full border border-line bg-canvas px-2.5 py-1 text-sm text-muted hover:text-ink"
      >
        x
      </button>
    </div>
  );
}
