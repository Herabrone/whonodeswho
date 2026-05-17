import type { RelationshipEpisode, RelationshipEvent } from "../../types";
import { compareTimelineDates } from "./intervals";

export interface TimelineDateRange {
  minDate: string;
  maxDate: string;
}

export function getTimelineDateRange(
  episodes: RelationshipEpisode[],
  events: RelationshipEvent[] = [],
): TimelineDateRange | null {
  const dates = [
    ...episodes.flatMap((episode) => [episode.startDate, episode.endDate].filter(Boolean) as string[]),
    ...events.map((event) => event.date),
  ];

  if (dates.length === 0) return null;

  const sorted = dates.sort(compareTimelineDates);
  return {
    minDate: sorted[0],
    maxDate: sorted[sorted.length - 1],
  };
}

export function getTimelineYearRange(
  episodes: RelationshipEpisode[],
  events: RelationshipEvent[] = [],
): { min: number; max: number } | null {
  const range = getTimelineDateRange(episodes, events);
  if (!range) return null;

  return {
    min: Number(range.minDate.slice(0, 4)),
    max: Number(range.maxDate.slice(0, 4)),
  };
}
