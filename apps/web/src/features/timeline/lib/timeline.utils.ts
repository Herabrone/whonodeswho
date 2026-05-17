import type { Person, Relationship } from "../../../types";

export function getTimelineRange(
  relationships: Relationship[],
): { min: number; max: number } | null {
  const years = relationships
    .map((relationship) => relationship.startYear)
    .filter((year): year is number => typeof year === "number");

  if (years.length === 0) return null;

  return {
    min: Math.min(...years),
    max: Math.max(...years),
  };
}

export function getRelationshipsAtYear(
  relationships: Relationship[],
  year: number,
): Array<{ rel: Relationship; ended: boolean }> {
  return relationships
    .filter(
      (relationship) =>
        relationship.startYear === undefined || relationship.startYear <= year,
    )
    .map((relationship) => ({
      rel: relationship,
      ended:
        relationship.isActive === false &&
        relationship.endYear !== undefined &&
        relationship.endYear <= year,
    }));
}

export function getAnniversaries(
  relationships: Relationship[],
  people: Person[],
  currentYear: number,
  currentMonth: number,
): Array<{ personName: string; yearsAgo: number; type: string }> {
  const peopleById = new Map(people.map((person) => [person.id, person]));

  return relationships
    .filter(
      (relationship) =>
        relationship.startYear !== undefined &&
        relationship.startMonth === currentMonth,
    )
    .map((relationship) => {
      const yearsAgo = currentYear - relationship.startYear!;
      return {
        personName:
          peopleById.get(relationship.target)?.name ??
          peopleById.get(relationship.source)?.name ??
          "Someone",
        yearsAgo,
        type: relationship.type,
      };
    })
    .filter((anniversary) => anniversary.yearsAgo > 0)
    .sort((a, b) => b.yearsAgo - a.yearsAgo);
}

export function getEraTitle(
  relationships: Relationship[],
  people: Person[],
  year: number,
): string | null {
  const started = relationships.filter((relationship) => relationship.startYear === year);
  const ended = relationships.filter((relationship) => relationship.endYear === year);

  if (started.length === 0 && ended.length === 0) return null;

  const workStarts = started.filter((relationship) => relationship.category === "work");
  if (workStarts.length > 0 && workStarts.length >= Math.max(1, Math.ceil(started.length / 2))) {
    return "Your work era";
  }

  const range = getTimelineRange(relationships);
  if (range && year === range.min && started.length > 0) {
    return "The year it all started";
  }

  const namesById = new Map(people.map((person) => [person.id, person.name]));
  const namedChanges = new Set<string>();
  for (const relationship of [...started, ...ended]) {
    const sourceName = namesById.get(relationship.source);
    const targetName = namesById.get(relationship.target);
    if (sourceName) namedChanges.add(sourceName);
    if (targetName) namedChanges.add(targetName);
  }

  if (ended.length > 0 || namedChanges.size >= 3 || started.length >= 3) {
    return "A year of change";
  }

  return null;
}
