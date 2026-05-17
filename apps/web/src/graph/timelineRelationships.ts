import type { GraphData, Relationship } from "../types";
import {
  getThreadKey,
  getThreadTimelineState,
  selectThreadsAndEpisodes,
  type DerivedThreadTimelineState,
} from "../domain/timeline";

export interface TimelineRelationshipView {
  relationship: Relationship;
  relationshipIds: string[];
  state: DerivedThreadTimelineState;
}

function compareRelationships(left: Relationship, right: Relationship): number {
  const leftYear = left.startYear ?? Number.MAX_SAFE_INTEGER;
  const rightYear = right.startYear ?? Number.MAX_SAFE_INTEGER;

  if (leftYear !== rightYear) return leftYear - rightYear;

  const createdAt = left.createdAt.localeCompare(right.createdAt);
  if (createdAt !== 0) return createdAt;

  return left.id.localeCompare(right.id);
}

export function buildTimelineRelationshipViews(
  graph: GraphData,
  timelineYear: number,
): TimelineRelationshipView[] {
  const { threads, episodesByThread } = selectThreadsAndEpisodes(graph);
  const relationshipsByThread = graph.relationships.reduce<Record<string, Relationship[]>>(
    (groups, relationship) => {
      const threadId = getThreadKey(relationship.source, relationship.target);
      groups[threadId] = [...(groups[threadId] ?? []), relationship];
      return groups;
    },
    {},
  );

  return threads
    .flatMap((thread) => {
      const threadRelationships = [...(relationshipsByThread[thread.id] ?? [])].sort(compareRelationships);
      if (threadRelationships.length === 0) return [];

      const state = getThreadTimelineState(
        thread,
        episodesByThread[thread.id] ?? [],
        timelineYear,
      );

      if (state.visibility === "hidden" || state.visibility === "future") {
        return [];
      }

      const primaryRelationship = threadRelationships[0];
      const direction = threadRelationships.some((relationship) => relationship.direction === "one-way")
        ? "one-way"
        : "two-way";

      return [{
        relationship: {
          ...primaryRelationship,
          source: thread.personAId,
          target: thread.personBId,
          type: state.displayLabel,
          category: state.displayCategory,
          direction,
          color: primaryRelationship.color,
        },
        relationshipIds: threadRelationships.map((relationship) => relationship.id),
        state,
      } satisfies TimelineRelationshipView];
    });
}