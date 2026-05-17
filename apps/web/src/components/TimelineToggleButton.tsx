import { useGraphStore } from "../store/useGraphStore";

export function TimelineToggleButton() {
  const timelineOpen = useGraphStore((s) => s.timelineOpen);
  const openTimeline = useGraphStore((s) => s.openTimeline);
  const closeTimeline = useGraphStore((s) => s.closeTimeline);

  return (
    <button
      type="button"
      onClick={() => (timelineOpen ? closeTimeline() : openTimeline())}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        timelineOpen
          ? "border-rf-text bg-rf-text text-rf-base"
          : "border-rf-border bg-rf-base text-rf-muted hover:text-rf-text"
      }`}
    >
      {timelineOpen ? "⏹ Timeline" : "⏱ Timeline"}
    </button>
  );
}
