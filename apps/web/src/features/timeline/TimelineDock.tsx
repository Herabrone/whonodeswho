import { useMemo } from "react";
import { selectTimelineData } from "../../domain/timeline";
import { useGraphStore } from "../../store/useGraphStore";
import { TimelineScrubber } from "./TimelineScrubber";
import { TimelineRelationshipBars } from "./TimelineRelationshipBars";
import { useTimelinePlayback } from "./useTimelinePlayback";

export function TimelineDock() {
  const timelineOpen = useGraphStore((s) => s.timelineOpen);
  const relationships = useGraphStore((s) => s.relationships);
  const people = useGraphStore((s) => s.people);
  const timelineYear = useGraphStore((s) => s.timelineYear);
  const closeTimeline = useGraphStore((s) => s.closeTimeline);

  const timelineData = useMemo(
    () => selectTimelineData({ people, relationships }),
    [people, relationships],
  );

  useTimelinePlayback();

  if (!timelineData.range) return null;

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
        padding: "12px 16px 16px",
        height: 260,
        overflow: "hidden",
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

      <TimelineScrubber
        minYear={timelineData.range.min}
        maxYear={timelineData.range.max + 1}
        markers={timelineData.markers}
      />
      {timelineData.episodes.length === 0 ? (
        <div className="mt-4 text-sm text-rf-muted">
          Add a dated relationship phase to see it appear on the timeline.
        </div>
      ) : (
        <div className="mt-4 h-[164px] overflow-auto rounded-xl border border-rf-border bg-rf-base/35">
          <TimelineRelationshipBars
            threads={timelineData.threads}
            episodesByThread={timelineData.episodesByThread}
            people={people}
            currentYear={timelineYear}
            minYear={timelineData.range.min}
            maxYear={timelineData.range.max + 1}
          />
        </div>
      )}
    </div>
  );
}
