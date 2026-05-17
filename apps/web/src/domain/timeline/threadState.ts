import type {
  RelationshipEpisode,
  RelationshipEvent,
  RelationshipThread,
  ThreadTimelineState,
  ThreadVisibility,
} from "../../types";
import {
  compareTimelineDates,
  intervalContainsDate,
  intervalEndsBeforeOrOnDate,
  intervalStartsAfterDate,
} from "./intervals";
import {
  displayCategoryForEpisodes,
  displayLabelForEpisodes,
  episodeDisplayLabel,
} from "./timelineTypes";

function byStartDate(left: RelationshipEpisode, right: RelationshipEpisode): number {
  return compareTimelineDates(left.startDate, right.startDate);
}

function sortedEpisodes(episodes: RelationshipEpisode[]): RelationshipEpisode[] {
  return [...episodes].sort(byStartDate);
}

function minDate(values: string[]): string | undefined {
  return values.sort(compareTimelineDates)[0];
}

function maxDate(values: string[]): string | undefined {
  return values.sort(compareTimelineDates).at(-1);
}

function getVisibility(
  activeEpisodes: RelationshipEpisode[],
  endedEpisodes: RelationshipEpisode[],
  futureEpisodes: RelationshipEpisode[],
): ThreadVisibility {
  if (activeEpisodes.length > 0) return "active";
  if (endedEpisodes.length > 0 && futureEpisodes.length > 0) return "dormant";
  if (endedEpisodes.length > 0) return "ended";
  if (futureEpisodes.length > 0) return "future";
  return "hidden";
}

function getChangeDates(
  episodes: RelationshipEpisode[],
  events: RelationshipEvent[],
): string[] {
  return [
    ...episodes.flatMap((episode) => [episode.startDate, episode.endDate].filter(Boolean) as string[]),
    ...events.map((event) => event.date),
  ];
}

function getLastChangedAt(changeDates: string[], queryDate: string): string | undefined {
  return maxDate(changeDates.filter((date) => compareTimelineDates(date, queryDate) <= 0));
}

function getNextChangeAt(changeDates: string[], queryDate: string): string | undefined {
  return minDate(changeDates.filter((date) => compareTimelineDates(date, queryDate) > 0));
}

export function getThreadStateAtDate(
  thread: RelationshipThread,
  episodes: RelationshipEpisode[],
  events: RelationshipEvent[],
  date: string,
): ThreadTimelineState {
  const threadEpisodes = sortedEpisodes(
    episodes.filter((episode) => episode.threadId === thread.id),
  );
  const threadEvents = events.filter((event) => event.threadId === thread.id);

  const activeEpisodes = threadEpisodes.filter((episode) =>
    intervalContainsDate(episode, date),
  );
  const endedEpisodes = threadEpisodes.filter((episode) =>
    intervalEndsBeforeOrOnDate(episode, date),
  );
  const futureEpisodes = threadEpisodes.filter((episode) =>
    intervalStartsAfterDate(episode, date),
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
  const edgeStyle = activeEpisodes.length > 1
    ? "multi"
    : activeEpisodes.length === 1
      ? "solid"
      : visibility === "ended"
        ? "dashed"
        : "ghost";
  const changeDates = getChangeDates(threadEpisodes, threadEvents);

  return {
    threadId: thread.id,
    visibility,
    activeEpisodes,
    endedEpisodes,
    futureEpisodes,
    displayLabel,
    displayCategory,
    displayColor: thread.colorOverride ?? `var(--rf-cat-${displayCategory}-gfx)`,
    edgeStyle,
    badges: activeEpisodes.length > 1 ? activeEpisodes.map(episodeDisplayLabel) : [],
    startedAt: minDate(threadEpisodes.map((episode) => episode.startDate)),
    lastChangedAt: getLastChangedAt(changeDates, date),
    nextChangeAt: getNextChangeAt(changeDates, date),
    tooltip: `${displayLabel} (${visibility})`,
  };
}
