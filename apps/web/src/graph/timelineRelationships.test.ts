import { describe, expect, it } from "vitest";
import type { GraphData, Relationship, RelationshipPhase } from "../types";
import { buildTimelineRelationshipViews } from "./timelineRelationships";

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
    ...(overrides.endYear !== undefined ? { endYear: overrides.endYear } : {}),
    ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
    ...(overrides.phases ? { phases: overrides.phases } : {}),
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
  };
}

function graph(relationships: Relationship[]): GraphData {
  return {
    people: [
      {
        id: "p1",
        name: "Alice",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "p2",
        name: "Bob",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    relationships,
  };
}

describe("buildTimelineRelationshipViews", () => {
  it("collapses overlapping legacy relationships into one active thread label", () => {
    const views = buildTimelineRelationshipViews(
      graph([
        relationship({
          id: "work",
          type: "coworker",
          category: "work",
          startYear: 2016,
          endYear: 2018,
          isActive: false,
        }),
        relationship({
          id: "friend",
          type: "friend",
          category: "friend",
          startYear: 2017,
        }),
      ]),
      2017,
    );

    expect(views).toHaveLength(1);
    expect(views[0].relationship.type).toBe("Coworker + Friend");
    expect(views[0].relationship.category).toBe("friend");
    expect(views[0].state.visibility).toBe("active");
    expect(views[0].relationshipIds).toEqual(["work", "friend"]);
  });

  it("keeps only the ongoing phase active after an earlier phase ends", () => {
    const views = buildTimelineRelationshipViews(
      graph([
        relationship({
          id: "work",
          type: "coworker",
          category: "work",
          startYear: 2016,
          endYear: 2018,
          isActive: false,
        }),
        relationship({
          id: "friend",
          type: "friend",
          category: "friend",
          startYear: 2017,
        }),
      ]),
      2018,
    );

    expect(views).toHaveLength(1);
    expect(views[0].relationship.type).toBe("Friend");
    expect(views[0].state.activeEpisodes).toHaveLength(1);
    expect(views[0].state.visibility).toBe("active");
  });

  it("keeps ended-only threads visible as ghost state", () => {
    const views = buildTimelineRelationshipViews(
      graph([
        relationship({
          id: "work",
          type: "coworker",
          category: "work",
          startYear: 2016,
          endYear: 2018,
          isActive: false,
        }),
      ]),
      2019,
    );

    expect(views).toHaveLength(1);
    expect(views[0].relationship.type).toBe("Coworker");
    expect(views[0].state.visibility).toBe("ended");
    expect(views[0].state.edgeStyle).toBe("dashed");
  });

  it("hides future-only threads before their first year", () => {
    const views = buildTimelineRelationshipViews(
      graph([
        relationship({
          id: "future",
          type: "friend",
          category: "friend",
          startYear: 2016,
        }),
      ]),
      2015,
    );

    expect(views).toHaveLength(0);
  });

  it("uses relationship phases when present instead of legacy timing fields", () => {
    const views = buildTimelineRelationshipViews(
      graph([
        relationship({
          id: "thread-owner",
          type: "friend",
          category: "friend",
          startYear: 1999,
          phases: [
            phase({
              id: "phase-work",
              type: "coworker",
              category: "work",
              label: "Coworker",
              startYear: 2016,
              endYear: 2018,
            }),
            phase({
              id: "phase-friend",
              type: "friend",
              category: "friend",
              label: "Friend",
              startYear: 2017,
            }),
          ],
        }),
      ]),
      2017,
    );

    expect(views).toHaveLength(1);
    expect(views[0].relationship.type).toBe("Coworker + Friend");
    expect(views[0].relationship.category).toBe("friend");
    expect(views[0].relationshipIds).toEqual(["thread-owner"]);
  });
});