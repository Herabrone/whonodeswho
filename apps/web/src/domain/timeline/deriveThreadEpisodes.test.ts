import { describe, expect, it } from "vitest";
import type { Relationship, RelationshipPhase } from "../../types";
import { deriveThreadsAndEpisodes } from "./deriveThreadEpisodes";

function phase(overrides: Partial<RelationshipPhase>): RelationshipPhase {
  return {
    id: overrides.id ?? "phase-1",
    type: overrides.type ?? "friend",
    category: overrides.category ?? "friend",
    label: overrides.label ?? "Friend",
    startYear: overrides.startYear ?? 2017,
    ...(overrides.endYear !== undefined ? { endYear: overrides.endYear } : {}),
    ...(overrides.notes ? { notes: overrides.notes } : {}),
    ...(overrides.source ? { source: overrides.source } : {}),
  };
}

function relationship(overrides: Partial<Relationship>): Relationship {
  return {
    id: overrides.id ?? "r1",
    source: overrides.source ?? "p1",
    target: overrides.target ?? "p2",
    type: overrides.type ?? "friend",
    category: overrides.category ?? "friend",
    direction: overrides.direction ?? "two-way",
    ...(overrides.startYear !== undefined ? { startYear: overrides.startYear } : {}),
    ...(overrides.startMonth !== undefined ? { startMonth: overrides.startMonth } : {}),
    ...(overrides.endYear !== undefined ? { endYear: overrides.endYear } : {}),
    ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
    ...(overrides.notes ? { notes: overrides.notes } : {}),
    ...(overrides.phases ? { phases: overrides.phases } : {}),
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
  };
}

describe("deriveThreadsAndEpisodes", () => {
  it("derives one legacy episode from a relationship without phases", () => {
    const result = deriveThreadsAndEpisodes([
      relationship({ id: "r1", type: "coworker", category: "work", startYear: 2016, endYear: 2018 }),
    ]);

    expect(result.threads).toHaveLength(1);
    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0]).toMatchObject({
      relationshipId: "r1",
      threadId: "p1::p2",
      type: "coworker",
      category: "work",
      label: "coworker",
      startYear: 2016,
      endYear: 2018,
      source: "legacy",
    });
  });

  it("uses phases instead of legacy relationship timing when phases exist", () => {
    const result = deriveThreadsAndEpisodes([
      relationship({
        id: "r1",
        type: "friend",
        category: "friend",
        startYear: 1999,
        phases: [phase({ id: "phase-work", type: "coworker", category: "work", label: "Coworker", startYear: 2016, endYear: 2018 })],
      }),
    ]);

    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0]).toMatchObject({
      id: "phase-work",
      relationshipId: "r1",
      type: "coworker",
      category: "work",
      label: "Coworker",
      startYear: 2016,
      endYear: 2018,
    });
  });

  it("collapses multiple relationships between the same pair into one thread", () => {
    const result = deriveThreadsAndEpisodes([
      relationship({ id: "r1", source: "p1", target: "p2", type: "coworker", category: "work", startYear: 2016, endYear: 2018 }),
      relationship({ id: "r2", source: "p2", target: "p1", type: "friend", category: "friend", startYear: 2017 }),
    ]);

    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].id).toBe("p1::p2");
    expect(result.threads[0].legacyRelationshipIds).toEqual(["r1", "r2"]);
    expect(result.episodes).toHaveLength(2);
  });
});