import { describe, expect, it } from "vitest";
import type { LegacyGraphData, LegacyRelationship, Person } from "../../types";
import {
  legacyTypeToEpisodeKind,
  migrateLegacyGraphToHistory,
} from "./timelineMigration";

const createdAt = "2020-05-14T12:00:00.000Z";

function person(id: string): Person {
  return {
    id,
    name: id,
    createdAt,
    updatedAt: createdAt,
  };
}

function relationship(overrides: Partial<LegacyRelationship>): LegacyRelationship {
  return {
    id: overrides.id ?? "r1",
    source: overrides.source ?? "b",
    target: overrides.target ?? "a",
    type: overrides.type ?? "friend",
    category: overrides.category ?? "friend",
    direction: overrides.direction ?? "two-way",
    createdAt: overrides.createdAt ?? createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    ...overrides,
  };
}

describe("legacy timeline migration", () => {
  it("maps legacy type strings to canonical episode kinds", () => {
    expect(legacyTypeToEpisodeKind("close friend")).toBe("close_friend");
    expect(legacyTypeToEpisodeKind("partner")).toBe("romantic_partner");
    expect(legacyTypeToEpisodeKind("ex-spouse")).toBe("ex_partner");
    expect(legacyTypeToEpisodeKind("classmate")).toBe("classmate");
    expect(legacyTypeToEpisodeKind("business partner")).toBe("custom");
  });

  it("converts one legacy relationship into one thread and one episode", () => {
    const graph: LegacyGraphData = {
      people: [person("a"), person("b")],
      relationships: [relationship({ id: "r1", startYear: 2019, startMonth: 3 })],
    };

    const migrated = migrateLegacyGraphToHistory(graph);
    const threads = Object.values(migrated.threads);
    const episodes = Object.values(migrated.episodes);

    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({ personAId: "a", personBId: "b" });
    expect(episodes).toHaveLength(1);
    expect(episodes[0]).toMatchObject({
      threadId: threads[0].id,
      kind: "friend",
      startDate: "2019-03-01",
      certainty: "exact",
      source: "imported",
    });
    expect(Object.values(migrated.events)).toHaveLength(0);
  });

  it("uses the relationship created timestamp when legacy dates are missing", () => {
    const migrated = migrateLegacyGraphToHistory({
      people: [person("a"), person("b")],
      relationships: [relationship({ id: "r1" })],
    });

    expect(Object.values(migrated.episodes)[0]).toMatchObject({
      startDate: "2020-05-14",
      certainty: "unknown",
    });
  });

  it("groups multiple legacy relationships for the same pair into one thread", () => {
    const migrated = migrateLegacyGraphToHistory({
      people: [person("a"), person("b")],
      relationships: [
        relationship({ id: "r1", source: "a", target: "b", type: "coworker" }),
        relationship({ id: "r2", source: "b", target: "a", type: "friend" }),
      ],
    });

    expect(Object.values(migrated.threads)).toHaveLength(1);
    expect(Object.values(migrated.episodes).map((episode) => episode.kind)).toEqual([
      "coworker",
      "friend",
    ]);
  });
});
