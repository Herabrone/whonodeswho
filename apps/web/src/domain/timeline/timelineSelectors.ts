import type {
  GraphData,
  RelationshipHistoryGraphData,
  ThreadTimelineState,
} from "../../types";
import { deriveThreadsAndEpisodes } from "./deriveThreadEpisodes";
import type {
  DerivedRelationshipEpisode,
  DerivedRelationshipThread,
  TimelineEpisodeMarker,
} from "./threadEpisodes";
import type {
  RelationshipEpisode as CanonicalRelationshipEpisode,
  RelationshipEvent as CanonicalRelationshipEvent,
} from "../../types";
import { getThreadStateAtDate } from "./threadState";

export function groupEpisodesByThread(
  episodes: Record<string, CanonicalRelationshipEpisode>,
): Record<string, CanonicalRelationshipEpisode[]> {
  return Object.values(episodes).reduce<Record<string, CanonicalRelationshipEpisode[]>>(
    (groups, episode) => {
      groups[episode.threadId] = [...(groups[episode.threadId] ?? []), episode];
      return groups;
    },
    {},
  );
}

export function groupEventsByThread(
  events: Record<string, CanonicalRelationshipEvent>,
): Record<string, CanonicalRelationshipEvent[]> {
  return Object.values(events).reduce<Record<string, CanonicalRelationshipEvent[]>>(
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

export interface TimelineThreadSelection {
  threads: DerivedRelationshipThread[];
  episodes: DerivedRelationshipEpisode[];
  episodesByThread: Record<string, DerivedRelationshipEpisode[]>;
}

export interface TimelineDataSelection extends TimelineThreadSelection {
  markers: TimelineEpisodeMarker[];
  range: { min: number; max: number } | null;
}

export function selectThreadsAndEpisodes(graph: GraphData): TimelineThreadSelection {
  const { threads, episodes, episodesByThread } = deriveThreadsAndEpisodes(graph.relationships);

  return {
    threads,
    episodes,
    episodesByThread,
  };
}

export function selectEpisodesForThread(
  graph: GraphData,
  threadId: string,
): DerivedRelationshipEpisode[] {
  return selectThreadsAndEpisodes(graph).episodesByThread[threadId] ?? [];
}

export function selectTimelineMarkers(graph: GraphData): TimelineEpisodeMarker[] {
  return selectThreadsAndEpisodes(graph).episodes.map((episode) => ({
    id: episode.id,
    relationshipId: episode.relationshipId,
    threadId: episode.threadId,
    label: episode.label,
    category: episode.category,
    startYear: episode.startYear,
    ...(episode.endYear !== undefined ? { endYear: episode.endYear } : {}),
  }));
}

export function selectTimelineRange(graph: GraphData): { min: number; max: number } | null {
  const { episodes } = selectThreadsAndEpisodes(graph);
  if (episodes.length === 0) return null;

  const currentYear = new Date().getFullYear();
  const years = episodes.flatMap((episode) => [episode.startYear, episode.endYear ?? currentYear]);

  return {
    min: Math.min(...years),
    max: Math.max(...years),
  };
}

export function selectTimelineData(graph: GraphData): TimelineDataSelection {
  const selection = selectThreadsAndEpisodes(graph);

  return {
    ...selection,
    markers: selection.episodes.map((episode) => ({
      id: episode.id,
      relationshipId: episode.relationshipId,
      threadId: episode.threadId,
      label: episode.label,
      category: episode.category,
      startYear: episode.startYear,
      ...(episode.endYear !== undefined ? { endYear: episode.endYear } : {}),
    })),
    range: selectTimelineRange(graph),
  };
}
