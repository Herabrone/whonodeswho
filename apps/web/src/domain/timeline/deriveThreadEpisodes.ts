import type { Relationship } from "../../types";
import {
  getThreadKey,
  normalizeThreadPeople,
  relationshipPhaseToEpisode,
  relationshipToLegacyEpisode,
  type DerivedRelationshipEpisode,
  type DerivedRelationshipThread,
} from "./threadEpisodes";

export interface DerivedThreadEpisodesResult {
  threads: DerivedRelationshipThread[];
  episodes: DerivedRelationshipEpisode[];
  episodesByThread: Record<string, DerivedRelationshipEpisode[]>;
}

function compareEpisodes(
  left: DerivedRelationshipEpisode,
  right: DerivedRelationshipEpisode,
): number {
  if (left.startYear !== right.startYear) return left.startYear - right.startYear;

  const leftEnd = left.endYear ?? Number.MAX_SAFE_INTEGER;
  const rightEnd = right.endYear ?? Number.MAX_SAFE_INTEGER;
  if (leftEnd !== rightEnd) return leftEnd - rightEnd;

  return left.id.localeCompare(right.id);
}

export function deriveThreadsAndEpisodes(
  relationships: Relationship[],
): DerivedThreadEpisodesResult {
  const threadsById: Record<string, DerivedRelationshipThread> = {};
  const episodes: DerivedRelationshipEpisode[] = [];

  for (const relationship of relationships) {
    const threadId = getThreadKey(relationship.source, relationship.target);
    const [personAId, personBId] = normalizeThreadPeople(
      relationship.source,
      relationship.target,
    );
    const existingThread = threadsById[threadId];

    if (!existingThread) {
      threadsById[threadId] = {
        id: threadId,
        personAId,
        personBId,
        legacyRelationshipIds: [relationship.id],
        createdAt: relationship.createdAt,
        updatedAt: relationship.updatedAt,
      };
    } else {
      threadsById[threadId] = {
        ...existingThread,
        legacyRelationshipIds: [...existingThread.legacyRelationshipIds, relationship.id],
        createdAt:
          existingThread.createdAt && existingThread.createdAt < relationship.createdAt
            ? existingThread.createdAt
            : relationship.createdAt,
        updatedAt:
          existingThread.updatedAt && existingThread.updatedAt > relationship.updatedAt
            ? existingThread.updatedAt
            : relationship.updatedAt,
      };
    }

    const relationshipEpisodes = relationship.phases?.length
      ? relationship.phases.map((phase, index) => relationshipPhaseToEpisode(relationship, phase, index))
      : [relationshipToLegacyEpisode(relationship)];

    episodes.push(...relationshipEpisodes);
  }

  const episodesByThread = episodes.reduce<Record<string, DerivedRelationshipEpisode[]>>(
    (groups, episode) => {
      groups[episode.threadId] = [...(groups[episode.threadId] ?? []), episode].sort(compareEpisodes);
      return groups;
    },
    {},
  );

  return {
    threads: Object.values(threadsById).sort((left, right) => left.id.localeCompare(right.id)),
    episodes: [...episodes].sort(compareEpisodes),
    episodesByThread,
  };
}