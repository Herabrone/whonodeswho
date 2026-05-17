import type {
  DerivedTimelineMarker,
  RelationshipEpisode,
  RelationshipEvent,
} from "../../types";
import { compareTimelineDates } from "./intervals";
import { episodeDisplayLabel } from "./timelineTypes";

const MARKER_KIND_ORDER: Record<DerivedTimelineMarker["kind"], number> = {
  episode_start: 0,
  stored_event: 1,
  episode_end: 2,
};

export function deriveBoundaryMarkers(
  episodes: RelationshipEpisode[],
): DerivedTimelineMarker[] {
  return episodes.flatMap((episode) => {
    const label = episodeDisplayLabel(episode);
    const markers: DerivedTimelineMarker[] = [
      {
        date: episode.startDate,
        kind: "episode_start",
        label: `Started ${label}`,
        episodeId: episode.id,
      },
    ];

    if (episode.endDate) {
      markers.push({
        date: episode.endDate,
        kind: "episode_end",
        label: `Ended ${label}`,
        episodeId: episode.id,
      });
    }

    return markers;
  });
}

export function storedEventMarkers(events: RelationshipEvent[]): DerivedTimelineMarker[] {
  return events.map((event) => ({
    date: event.date,
    kind: "stored_event",
    label: event.title,
    eventId: event.id,
  }));
}

export function sortTimelineMarkers(
  markers: DerivedTimelineMarker[],
): DerivedTimelineMarker[] {
  return [...markers].sort((left, right) => {
    const dateOrder = compareTimelineDates(left.date, right.date);
    if (dateOrder !== 0) return dateOrder;
    return MARKER_KIND_ORDER[left.kind] - MARKER_KIND_ORDER[right.kind];
  });
}

export function getTimelineMarkers(
  episodes: RelationshipEpisode[],
  events: RelationshipEvent[],
): DerivedTimelineMarker[] {
  return sortTimelineMarkers([
    ...deriveBoundaryMarkers(episodes),
    ...storedEventMarkers(events),
  ]);
}
