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

  const range = useMemo(() => getTimelineRange(relationships), [relationships]);
  const datedRelationships = relationships.filter((relationship) => relationship.startYear !== undefined);

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
      <TimelineScrubber minYear={range.min} maxYear={range.max + 1} />
      {datedRelationships.length < 2 ? (
        <div className="mt-4 text-sm text-rf-muted">
          Add a “Year started” to your relationships to enable the timeline.
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
