import { useMemo } from "react";
import { useGraphStore } from "../../store/useGraphStore";
import { LifespanBars } from "./LifespanBars";
import { TimelineScrubber } from "./TimelineScrubber";
import { useTimelinePlayback } from "./useTimelinePlayback";
import { getTimelineRange } from "./lib/timeline.utils";

export function TimelineDock() {
  const timelineOpen = useGraphStore((s) => s.timelineOpen);
  const relationships = useGraphStore((s) => s.relationships);
  const people = useGraphStore((s) => s.people);
  const timelineYear = useGraphStore((s) => s.timelineYear);
  const closeTimeline = useGraphStore((s) => s.closeTimeline);

  const range = useMemo(() => getTimelineRange(relationships), [relationships]);
  const datedRelationships = relationships.filter((r) => r.startYear !== undefined);

  useTimelinePlayback();

  if (!range) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 25,
        background: "var(--rf-bg-surface)",
        borderTop: "1px solid var(--rf-border-default)",
        boxShadow: "var(--rf-shadow-top-dock)",
        padding: "12px 16px",
        transform: timelineOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-rf-text">Relationship timeline</div>
          <div className="text-xs text-rf-muted">
            Move the slider to see active and ended relationships update on the graph.
          </div>
        </div>
        <button
          type="button"
          onClick={closeTimeline}
          className="rounded-full border border-rf-border bg-rf-subtle px-3 py-1 text-sm text-rf-muted hover:text-rf-text"
        >
          Hide
        </button>
      </div>

      <TimelineScrubber minYear={range.min} maxYear={range.max + 1} />
      {datedRelationships.length < 2 ? (
        <div className="mt-4 text-sm text-rf-muted">
          Add a "Year started" to at least two relationships to see changes over time.
        </div>
      ) : (
        <LifespanBars
          relationships={datedRelationships}
          people={people}
          currentYear={timelineYear}
          minYear={range.min}
          maxYear={range.max + 1}
        />
      )}
    </div>
  );
}
