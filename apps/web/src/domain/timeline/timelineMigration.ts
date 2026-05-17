import type {
  EpisodeCertainty,
  EpisodeKind,
  LegacyGraphData,
  LegacyRelationship,
  RelationshipEpisode,
  RelationshipHistoryGraphData,
  RelationshipThread,
} from "../../types";
import {
  episodeKindLabel,
  makeThreadId,
  normalizeThreadParticipants,
} from "./timelineTypes";

function normalizeLegacyType(type: string): string {
  return type.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function legacyTypeToEpisodeKind(type: string): EpisodeKind {
  switch (normalizeLegacyType(type)) {
    case "coworker":
    case "manager":
    case "employee":
    case "friend":
    case "spouse":
    case "classmate":
    case "roommate":
      return normalizeLegacyType(type) as EpisodeKind;
    case "close_friend":
    case "best_friend":
      return "close_friend";
    case "partner":
    case "romantic_partner":
      return "romantic_partner";
    case "ex_partner":
    case "ex_spouse":
      return "ex_partner";
    case "family":
    case "parent":
    case "child":
    case "sibling":
    case "grandparent":
    case "grandchild":
    case "aunt_uncle":
    case "niece_nephew":
    case "cousin":
    case "step_parent":
    case "step_child":
    case "step_sibling":
    case "half_sibling":
      return "family";
    default:
      return "custom";
  }
}

function padMonth(month: number): string {
  return String(Math.min(12, Math.max(1, month))).padStart(2, "0");
}

function dateFromYearMonth(year: number, month = 1): string {
  return `${year}-${padMonth(month)}-01`;
}

function dateFromTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return new Date().toISOString().slice(0, 10);
  return new Date(timestamp).toISOString().slice(0, 10);
}

function legacyStartDate(relationship: LegacyRelationship): string {
  if (relationship.startYear !== undefined) {
    return dateFromYearMonth(relationship.startYear, relationship.startMonth ?? 1);
  }

  return dateFromTimestamp(relationship.createdAt);
}

function legacyEndDate(relationship: LegacyRelationship): string | undefined {
  return relationship.endYear === undefined
    ? undefined
    : dateFromYearMonth(relationship.endYear);
}

function legacyCertainty(relationship: LegacyRelationship): EpisodeCertainty {
  if (relationship.startYear === undefined) return "unknown";
  return relationship.startMonth === undefined ? "approximate" : "exact";
}

function customLabelForLegacyType(
  relationship: LegacyRelationship,
  kind: EpisodeKind,
): string | undefined {
  const trimmedType = relationship.type.trim();
  if (!trimmedType) return kind === "custom" ? "Custom" : undefined;

  const defaultLabel = episodeKindLabel(kind).toLowerCase();
  const legacyLabel = trimmedType.replace(/[_-]+/g, " ").toLowerCase();
  if (kind === "custom" || legacyLabel !== defaultLabel) return trimmedType;
  return undefined;
}

function upsertThread(
  threads: Record<string, RelationshipThread>,
  relationship: LegacyRelationship,
): RelationshipThread {
  const id = makeThreadId(relationship.source, relationship.target);
  const [personAId, personBId] = normalizeThreadParticipants(
    relationship.source,
    relationship.target,
  );
  const existing = threads[id];

  if (existing) {
    const createdAt = existing.createdAt < relationship.createdAt
      ? existing.createdAt
      : relationship.createdAt;
    const updatedAt = existing.updatedAt > relationship.updatedAt
      ? existing.updatedAt
      : relationship.updatedAt;

    threads[id] = {
      ...existing,
      colorOverride: existing.colorOverride ?? relationship.color,
      createdAt,
      updatedAt,
    };
    return threads[id];
  }

  const thread: RelationshipThread = {
    id,
    personAId,
    personBId,
    ...(relationship.color ? { colorOverride: relationship.color } : {}),
    createdAt: relationship.createdAt,
    updatedAt: relationship.updatedAt,
  };
  threads[id] = thread;
  return thread;
}

export function migrateLegacyRelationshipToEpisode(
  relationship: LegacyRelationship,
  threadId: string,
): RelationshipEpisode {
  const kind = legacyTypeToEpisodeKind(relationship.type);
  const label = customLabelForLegacyType(relationship, kind);

  return {
    id: `episode:${relationship.id}`,
    threadId,
    kind,
    ...(label ? { label } : {}),
    startDate: legacyStartDate(relationship),
    ...(legacyEndDate(relationship) ? { endDate: legacyEndDate(relationship) } : {}),
    certainty: legacyCertainty(relationship),
    source: "imported",
    ...(relationship.notes ? { notes: relationship.notes } : {}),
  };
}

export function migrateLegacyGraphToHistory(
  graph: LegacyGraphData,
): RelationshipHistoryGraphData {
  const threads: Record<string, RelationshipThread> = {};
  const episodes: Record<string, RelationshipEpisode> = {};

  for (const relationship of graph.relationships) {
    const thread = upsertThread(threads, relationship);
    const episode = migrateLegacyRelationshipToEpisode(relationship, thread.id);
    episodes[episode.id] = episode;
  }

  return {
    people: graph.people,
    threads,
    episodes,
    events: {},
  };
}
