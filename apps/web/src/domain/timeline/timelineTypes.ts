import type {
  EpisodeKind,
  RelationshipCategory,
  RelationshipEpisode,
} from "../../types";

export type {
  DerivedTimelineMarker,
  EpisodeCertainty,
  EpisodeKind,
  EpisodeSource,
  RelationshipEpisode,
  RelationshipEvent,
  RelationshipHistoryGraphData,
  RelationshipThread,
  ThreadTimelineState,
  ThreadVisibility,
} from "../../types";

export const KIND_TO_CATEGORY: Record<EpisodeKind, RelationshipCategory> = {
  coworker: "work",
  manager: "work",
  employee: "work",
  friend: "friend",
  close_friend: "friend",
  romantic_partner: "romantic",
  spouse: "romantic",
  ex_partner: "romantic",
  family: "family",
  classmate: "education",
  roommate: "other",
  custom: "other",
};

export const EPISODE_KIND_LABELS: Record<EpisodeKind, string> = {
  coworker: "Coworker",
  manager: "Manager",
  employee: "Employee",
  friend: "Friend",
  close_friend: "Close friend",
  romantic_partner: "Partner",
  spouse: "Spouse",
  ex_partner: "Ex-partner",
  family: "Family",
  classmate: "Classmate",
  roommate: "Roommate",
  custom: "Custom",
};

export const CATEGORY_PRIORITY: RelationshipCategory[] = [
  "romantic",
  "family",
  "friend",
  "work",
  "education",
  "other",
];

const CATEGORY_RANK = new Map(
  CATEGORY_PRIORITY.map((category, index) => [category, index]),
);

export function episodeCategory(kind: EpisodeKind): RelationshipCategory {
  return KIND_TO_CATEGORY[kind];
}

export function episodeKindLabel(kind: EpisodeKind): string {
  return EPISODE_KIND_LABELS[kind];
}

export function episodeDisplayLabel(episode: RelationshipEpisode): string {
  return episode.label?.trim() || episodeKindLabel(episode.kind);
}

export function categoryPriority(category: RelationshipCategory): number {
  return CATEGORY_RANK.get(category) ?? CATEGORY_RANK.get("other")!;
}

export function compareCategoriesByPriority(
  left: RelationshipCategory,
  right: RelationshipCategory,
): number {
  return categoryPriority(left) - categoryPriority(right);
}

export function displayCategoryForEpisodes(
  episodes: RelationshipEpisode[],
): RelationshipCategory {
  if (episodes.length === 0) return "other";

  return episodes
    .map((episode) => episodeCategory(episode.kind))
    .sort(compareCategoriesByPriority)[0];
}

export function displayLabelForEpisodes(
  episodes: RelationshipEpisode[],
): string {
  const labels = episodes.map(episodeDisplayLabel);
  return [...new Set(labels)].join(" + ") || "Relationship";
}

export function normalizeThreadParticipants(
  firstPersonId: string,
  secondPersonId: string,
): [string, string] {
  return firstPersonId < secondPersonId
    ? [firstPersonId, secondPersonId]
    : [secondPersonId, firstPersonId];
}

export function makeThreadId(firstPersonId: string, secondPersonId: string): string {
  const [personAId, personBId] = normalizeThreadParticipants(
    firstPersonId,
    secondPersonId,
  );

  return `thread:${encodeURIComponent(personAId)}:${encodeURIComponent(personBId)}`;
}
