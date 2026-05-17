import type {
  RelationshipEpisode,
  RelationshipHistoryGraphData,
  RelationshipThread,
} from "../../types";
import {
  compareTimelineDates,
  intervalsEqual,
  intervalsOverlap,
  isValidTimelineDate,
} from "./intervals";

export interface TimelineValidationIssue {
  severity: "fatal" | "warning";
  code:
    | "self-thread"
    | "orphan-episode"
    | "invalid-date"
    | "end-before-start"
    | "duplicate-episode"
    | "overlapping-spouse";
  message: string;
  threadId?: string;
  episodeIds?: string[];
}

function validateThread(thread: RelationshipThread): TimelineValidationIssue[] {
  if (thread.personAId !== thread.personBId) return [];

  return [{
    severity: "fatal",
    code: "self-thread",
    message: "A relationship thread cannot connect a person to themselves.",
    threadId: thread.id,
  }];
}

function validateEpisodeDates(
  episode: RelationshipEpisode,
): TimelineValidationIssue[] {
  const issues: TimelineValidationIssue[] = [];

  if (!isValidTimelineDate(episode.startDate)) {
    issues.push({
      severity: "fatal",
      code: "invalid-date",
      message: "Episode start date must be a valid ISO date.",
      threadId: episode.threadId,
      episodeIds: [episode.id],
    });
  }

  if (episode.endDate !== undefined && !isValidTimelineDate(episode.endDate)) {
    issues.push({
      severity: "fatal",
      code: "invalid-date",
      message: "Episode end date must be a valid ISO date.",
      threadId: episode.threadId,
      episodeIds: [episode.id],
    });
  }

  if (
    episode.endDate !== undefined &&
    isValidTimelineDate(episode.startDate) &&
    isValidTimelineDate(episode.endDate) &&
    compareTimelineDates(episode.endDate, episode.startDate) < 0
  ) {
    issues.push({
      severity: "fatal",
      code: "end-before-start",
      message: "Episode end date cannot be before its start date.",
      threadId: episode.threadId,
      episodeIds: [episode.id],
    });
  }

  return issues;
}

function duplicateEpisodeIssues(
  episodes: RelationshipEpisode[],
): TimelineValidationIssue[] {
  const seen = new Map<string, RelationshipEpisode>();
  const issues: TimelineValidationIssue[] = [];

  for (const episode of episodes) {
    const key = `${episode.threadId}:${episode.kind}:${episode.startDate}:${episode.endDate ?? ""}`;
    const duplicate = seen.get(key);
    if (!duplicate) {
      seen.set(key, episode);
      continue;
    }

    issues.push({
      severity: "fatal",
      code: "duplicate-episode",
      message: "Duplicate relationship episodes with the same kind and date range are not allowed.",
      threadId: episode.threadId,
      episodeIds: [duplicate.id, episode.id],
    });
  }

  return issues;
}

function overlappingSpouseIssues(
  episodes: RelationshipEpisode[],
): TimelineValidationIssue[] {
  const spouseEpisodes = episodes.filter((episode) => episode.kind === "spouse");
  const issues: TimelineValidationIssue[] = [];

  for (let leftIndex = 0; leftIndex < spouseEpisodes.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < spouseEpisodes.length; rightIndex++) {
      const left = spouseEpisodes[leftIndex];
      const right = spouseEpisodes[rightIndex];
      if (intervalsEqual(left, right)) continue;
      if (!intervalsOverlap(left, right)) continue;

      issues.push({
        severity: "warning",
        code: "overlapping-spouse",
        message: "Overlapping spouse episodes may be intentional, but they should be reviewed.",
        threadId: left.threadId,
        episodeIds: [left.id, right.id],
      });
    }
  }

  return issues;
}

export function validateTimelineGraph(
  graph: RelationshipHistoryGraphData,
): TimelineValidationIssue[] {
  const threads = Object.values(graph.threads);
  const episodes = Object.values(graph.episodes);
  const threadIds = new Set(threads.map((thread) => thread.id));
  const issues: TimelineValidationIssue[] = [];

  for (const thread of threads) {
    issues.push(...validateThread(thread));
  }

  for (const episode of episodes) {
    if (!threadIds.has(episode.threadId)) {
      issues.push({
        severity: "fatal",
        code: "orphan-episode",
        message: "Episode must belong to an existing relationship thread.",
        threadId: episode.threadId,
        episodeIds: [episode.id],
      });
    }

    issues.push(...validateEpisodeDates(episode));
  }

  issues.push(...duplicateEpisodeIssues(episodes));
  issues.push(...overlappingSpouseIssues(episodes));
  return issues;
}
