import type {
  RelationshipEpisode,
  RelationshipEvent,
  RelationshipHistoryGraphData,
  ThreadTimelineState,
} from "../../types";
import { getThreadStateAtDate } from "./threadState";

export function groupEpisodesByThread(
  episodes: Record<string, RelationshipEpisode>,
): Record<string, RelationshipEpisode[]> {
  return Object.values(episodes).reduce<Record<string, RelationshipEpisode[]>>(
    (groups, episode) => {
      groups[episode.threadId] = [...(groups[episode.threadId] ?? []), episode];
      return groups;
    },
    {},
  );
}

export function groupEventsByThread(
  events: Record<string, RelationshipEvent>,
): Record<string, RelationshipEvent[]> {
  return Object.values(events).reduce<Record<string, RelationshipEvent[]>>(
    (groups, event) => {
      groups[event.threadId] = [...(groups[event.threadId] ?? []), event];
      return groups;
    },
    {},
  );
}

export function selectThreadStatesAtDate(
  graph: RelationshipHistoryGraphData,
  date: string,
): Record<string, ThreadTimelineState> {
  const episodesByThread = groupEpisodesByThread(graph.episodes);
  const eventsByThread = groupEventsByThread(graph.events);
  const states: Record<string, ThreadTimelineState> = {};

  for (const thread of Object.values(graph.threads)) {
    states[thread.id] = getThreadStateAtDate(
      thread,
      episodesByThread[thread.id] ?? [],
      eventsByThread[thread.id] ?? [],
      date,
    );
  }

  return states;
}

export function selectVisibleThreadStatesAtDate(
  graph: RelationshipHistoryGraphData,
  date: string,
): ThreadTimelineState[] {
  return Object.values(selectThreadStatesAtDate(graph, date)).filter(
    (state) => state.visibility !== "hidden",
  );
}
