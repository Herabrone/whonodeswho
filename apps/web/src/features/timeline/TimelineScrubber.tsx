import { useMemo } from "react";
import { CATEGORY_UI_COLORS } from "../../constants";
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
  const events = relationships.flatMap((relationship) => {
    const personName =
      peopleById.get(relationship.target)?.name ??
      peopleById.get(relationship.source)?.name ??
      "Unknown";
    const items: Array<{
      id: string;
      year: number;
      category: keyof typeof CATEGORY_UI_COLORS;
      title: string;
    }> = [];

    if (relationship.startYear !== undefined) {
      items.push({
        id: `${relationship.id}:start`,
        year: relationship.startYear,
        category: relationship.category,
        title: `${relationship.startYear} - ${personName} (${relationship.type} started)`,
      });
    }

    if (relationship.endYear !== undefined) {
      items.push({
        id: `${relationship.id}:end`,
        year: relationship.endYear,
        category: relationship.category,
        title: `${relationship.endYear} - ${personName} (${relationship.type} ended)`,
      });
    }

    return items;
  });

  return (
    <div className="flex items-center gap-3 pt-4">
      <button
        type="button"
        onClick={() => setTimelinePlaying(!timelinePlaying)}
        className="rounded-full border border-rf-border bg-rf-subtle px-2.5 py-1 text-sm text-rf-text hover:bg-rf-base"
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
          style={{ accentColor: "var(--rf-accent)" }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3">
          {events.map((event) => {
            return (
              <span
                key={event.id}
                title={event.title}
                style={{
                  position: "absolute",
                  left: toPercent(event.year, minYear, maxYear),
                  top: 0,
                  width: 8,
                  height: 8,
                  transform: "translate(-50%, 0)",
                  borderRadius: "999px",
                  backgroundColor: CATEGORY_UI_COLORS[event.category],
                  boxShadow: "0 0 0 2px var(--rf-bg-surface)",
                }}
              />
            );
          })}
        </div>
      </div>

      <span className="w-14 text-center font-mono text-sm text-rf-text">
        {Math.floor(timelineYear)}
      </span>

      <div className="flex items-center rounded-full border border-rf-border bg-rf-subtle p-0.5 text-xs">
        {[1, 2, 3].map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => setTimelineSpeed(speed as 1 | 2 | 3)}
            className={`rounded-full px-2 py-1 ${
              timelineSpeed === speed ? "bg-rf-accent text-white" : "text-rf-text hover:bg-rf-base"
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={closeTimeline}
        className="rounded-full border border-rf-border bg-rf-subtle px-2.5 py-1 text-sm text-rf-muted hover:text-rf-text"
      >
        x
      </button>
    </div>
  );
}
