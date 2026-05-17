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
          ? "border-ink bg-ink text-canvas"
          : "border-line bg-canvas text-muted hover:text-ink"
      }`}
    >
      {timelineOpen ? "⏹ Timeline" : "⏱ Timeline"}
    </button>
  );
}
