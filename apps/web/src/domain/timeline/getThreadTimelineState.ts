import type { RelationshipCategory, ThreadVisibility } from "../../types";
import type {
  DerivedRelationshipEpisode,
  DerivedRelationshipThread,
} from "./threadEpisodes";

const CATEGORY_PRIORITY: RelationshipCategory[] = [
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

export interface DerivedThreadTimelineState {
  threadId: string;
  visibility: ThreadVisibility;
  activeEpisodes: DerivedRelationshipEpisode[];
  endedEpisodes: DerivedRelationshipEpisode[];
  futureEpisodes: DerivedRelationshipEpisode[];
  displayLabel: string;
  displayCategory: RelationshipCategory;
  displayColor: string;
  edgeStyle: "solid" | "dashed" | "ghost" | "multi";
  badges: string[];
  tooltip: string;
}

function displayCategoryForEpisodes(
  episodes: DerivedRelationshipEpisode[],
): RelationshipCategory {
  if (episodes.length === 0) return "other";

  return [...episodes]
    .sort(
      (left, right) =>
        (CATEGORY_RANK.get(left.category) ?? CATEGORY_PRIORITY.length) -
        (CATEGORY_RANK.get(right.category) ?? CATEGORY_PRIORITY.length),
    )[0].category;
}

function capitalizeWords(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function displayLabelForEpisodes(episodes: DerivedRelationshipEpisode[]): string {
  return [...new Set(episodes.map((episode) => capitalizeWords(episode.label)))].join(" + ") || "Relationship";
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

function getVisibility(
  activeEpisodes: DerivedRelationshipEpisode[],
  endedEpisodes: DerivedRelationshipEpisode[],
  futureEpisodes: DerivedRelationshipEpisode[],
): ThreadVisibility {
  if (activeEpisodes.length > 0) return "active";
  if (endedEpisodes.length > 0 && futureEpisodes.length > 0) return "dormant";
  if (endedEpisodes.length > 0) return "ended";
  if (futureEpisodes.length > 0) return "future";
  return "hidden";
}

export function getThreadTimelineState(
  thread: DerivedRelationshipThread,
  episodes: DerivedRelationshipEpisode[],
  timelineYear: number,
): DerivedThreadTimelineState {
  const sortedEpisodes = [...episodes].sort(compareEpisodes);
  const activeEpisodes = sortedEpisodes.filter(
    (episode) =>
      episode.startYear <= timelineYear &&
      (episode.endYear === undefined || timelineYear < episode.endYear),
  );
  const endedEpisodes = sortedEpisodes.filter(
    (episode) => episode.endYear !== undefined && timelineYear >= episode.endYear,
  );
  const futureEpisodes = sortedEpisodes.filter(
    (episode) => timelineYear < episode.startYear,
  );
  const visibility = getVisibility(activeEpisodes, endedEpisodes, futureEpisodes);
  const displayEpisodes =
    activeEpisodes.length > 0
      ? activeEpisodes
      : endedEpisodes.length > 0
        ? endedEpisodes
        : futureEpisodes;
  const displayCategory = displayCategoryForEpisodes(displayEpisodes);
  const displayLabel = displayLabelForEpisodes(displayEpisodes);

  return {
    threadId: thread.id,
    visibility,
    activeEpisodes,
    endedEpisodes,
    futureEpisodes,
    displayLabel,
    displayCategory,
    displayColor: `var(--rf-cat-${displayCategory}-gfx)`,
    edgeStyle:
      activeEpisodes.length > 1
        ? "multi"
        : activeEpisodes.length === 1
          ? "solid"
          : visibility === "ended" || visibility === "dormant"
            ? "dashed"
            : "ghost",
    badges: activeEpisodes.length > 1 ? activeEpisodes.map((episode) => episode.label) : [],
    tooltip: `${displayLabel} (${visibility})`,
  };
}