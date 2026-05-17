import { useEffect } from "react";
import { useGraphStore } from "../../store/useGraphStore";
import { getTimelineRange } from "./lib/timeline.utils";

export function useTimelinePlayback() {
  const timelinePlaying = useGraphStore((s) => s.timelinePlaying);
  const timelineSpeed = useGraphStore((s) => s.timelineSpeed);
  const relationships = useGraphStore((s) => s.relationships);
  const setTimelineYear = useGraphStore((s) => s.setTimelineYear);
  const setTimelinePlaying = useGraphStore((s) => s.setTimelinePlaying);

  useEffect(() => {
    if (!timelinePlaying) return;

    const range = getTimelineRange(relationships);
    const maxYear = range ? range.max + 1 : new Date().getFullYear();
    const yearsPerTick = 0.025 * timelineSpeed;

    const intervalId = window.setInterval(() => {
      setTimelineYear((prev) => {
        if (prev >= maxYear) {
          setTimelinePlaying(false);
          return prev;
        }
        return prev + yearsPerTick;
      });
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [relationships, setTimelinePlaying, setTimelineYear, timelinePlaying, timelineSpeed]);
}
