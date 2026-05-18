import type {
  Relationship,
  RelationshipCategory,
  RelationshipPhase,
} from "../../types";

export interface DerivedRelationshipThread {
  id: string;
  personAId: string;
  personBId: string;
  legacyRelationshipIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DerivedRelationshipEpisode {
  id: string;
  relationshipId: string;
  threadId: string;
  type: string;
  category: RelationshipCategory;
  label: string;
  startYear: number;
  endYear?: number;
  startMonth?: number;
  endMonth?: number;
  isCurrent?: boolean;
  notes?: string;
  source?: "user" | "legacy";
}

export interface TimelineEpisodeMarker {
  id: string;
  relationshipId: string;
  threadId: string;
  label: string;
  category: RelationshipCategory;
  startYear: number;
  endYear?: number;
}

export function getThreadKey(firstPersonId: string, secondPersonId: string): string {
  return firstPersonId < secondPersonId
    ? `${firstPersonId}::${secondPersonId}`
    : `${secondPersonId}::${firstPersonId}`;
}

export function normalizeThreadPeople(
  firstPersonId: string,
  secondPersonId: string,
): [string, string] {
  return firstPersonId < secondPersonId
    ? [firstPersonId, secondPersonId]
    : [secondPersonId, firstPersonId];
}

function fallbackLegacyStartYear(relationship: Relationship): number {
  if (relationship.startYear !== undefined) return relationship.startYear;

  const createdYear = Number(relationship.createdAt.slice(0, 4));
  return Number.isFinite(createdYear) ? createdYear : new Date().getFullYear();
}

export function relationshipToLegacyEpisode(
  relationship: Relationship,
): DerivedRelationshipEpisode {
  return {
    id: `${relationship.id}:legacy-episode`,
    relationshipId: relationship.id,
    threadId: getThreadKey(relationship.source, relationship.target),
    type: relationship.type,
    category: relationship.category,
    label: relationship.type,
    startYear: fallbackLegacyStartYear(relationship),
    ...(relationship.endYear !== undefined ? { endYear: relationship.endYear } : {}),
    ...(relationship.notes ? { notes: relationship.notes } : {}),
    source: "legacy",
  };
}

export function relationshipPhaseToEpisode(
  relationship: Relationship,
  phase: RelationshipPhase,
  phaseIndex: number,
): DerivedRelationshipEpisode {
  return {
    id: `${relationship.id}:phase:${phaseIndex}`,
    relationshipId: relationship.id,
    threadId: getThreadKey(relationship.source, relationship.target),
    type: phase.type,
    category: phase.category,
    label: phase.type,
    startYear: phase.fromYear,
    ...(phase.fromMonth !== undefined ? { startMonth: phase.fromMonth } : {}),
    ...(!phase.isCurrent && phase.toYear !== undefined ? { endYear: phase.toYear } : {}),
    ...(!phase.isCurrent && phase.toMonth !== undefined ? { endMonth: phase.toMonth } : {}),
    ...(phase.isCurrent ? { isCurrent: true } : {}),
    source: "user",
  };
}