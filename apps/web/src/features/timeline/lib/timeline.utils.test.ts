import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "../../../types";
import {
  getAnniversaries,
  getEraTitle,
  getRelationshipsAtYear,
  getTimelineRange,
} from "./timeline.utils";

function relationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: overrides.id ?? "r1",
    source: overrides.source ?? "p1",
    target: overrides.target ?? "p2",
    type: overrides.type ?? "friend",
    category: overrides.category ?? "friend",
    direction: overrides.direction ?? "two-way",
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function person(id: string, name: string): Person {
  return {
    id,
    name,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

describe("getTimelineRange", () => {
  it("returns null for relationships with no startYear", () => {
    expect(getTimelineRange([relationship()])).toBeNull();
  });

  it("returns correct min and max years", () => {
    expect(
      getTimelineRange([
        relationship({ id: "r1", startYear: 2018 }),
        relationship({ id: "r2", startYear: 2022 }),
      ]),
    ).toEqual({ min: 2018, max: 2022 });
  });

  it("ignores relationships without startYear in the range", () => {
    expect(
      getTimelineRange([
        relationship({ id: "r1" }),
        relationship({ id: "r2", startYear: 2020 }),
      ]),
    ).toEqual({ min: 2020, max: 2020 });
  });
});

describe("getRelationshipsAtYear", () => {
  it("includes relationships that started at or before the year", () => {
    const result = getRelationshipsAtYear([relationship({ startYear: 2018 })], 2019);
    expect(result).toHaveLength(1);
    expect(result[0].ended).toBe(false);
  });

  it("excludes relationships that start after the year", () => {
    expect(
      getRelationshipsAtYear([relationship({ startYear: 2021 })], 2020),
    ).toHaveLength(0);
  });

  it("marks ended relationships correctly after their endYear", () => {
    const result = getRelationshipsAtYear(
      [relationship({ startYear: 2017, endYear: 2020, isActive: false })],
      2022,
    );
    expect(result[0].ended).toBe(true);
  });

  it("includes relationships without startYear always", () => {
    expect(getRelationshipsAtYear([relationship()], 1980)).toHaveLength(1);
  });
});

describe("getAnniversaries", () => {
  const people = [person("p1", "Alice"), person("p2", "Bob"), person("p3", "Cara")];

  it("finds a relationship whose startMonth matches the current month", () => {
    const result = getAnniversaries(
      [relationship({ startYear: 2020, startMonth: 5 })],
      people,
      2025,
      5,
    );
    expect(result).toHaveLength(1);
  });

  it("calculates yearsAgo correctly", () => {
    const result = getAnniversaries(
      [relationship({ startYear: 2019, startMonth: 5 })],
      people,
      2025,
      5,
    );
    expect(result[0].yearsAgo).toBe(6);
  });

  it("ignores relationships with no startMonth", () => {
    expect(
      getAnniversaries([relationship({ startYear: 2019 })], people, 2025, 5),
    ).toHaveLength(0);
  });

  it("returns multiple anniversaries sorted by yearsAgo desc", () => {
    const result = getAnniversaries(
      [
        relationship({ id: "r1", startYear: 2022, startMonth: 5, target: "p2" }),
        relationship({ id: "r2", startYear: 2018, startMonth: 5, target: "p3" }),
      ],
      people,
      2025,
      5,
    );
    expect(result.map((item) => item.yearsAgo)).toEqual([7, 3]);
  });
});

describe("getEraTitle", () => {
  it("returns the first-year title", () => {
    const relationships = [relationship({ startYear: 2020 }), relationship({ startYear: 2022 })];
    expect(getEraTitle(relationships, [person("p1", "Alice"), person("p2", "Bob")], 2020)).toBe(
      "The year it all started",
    );
  });

  it("returns the work-era title for work-heavy years", () => {
    const relationships = [
      relationship({ id: "r1", startYear: 2021, category: "work" }),
      relationship({ id: "r2", startYear: 2021, category: "work" }),
      relationship({ id: "r3", startYear: 2021, category: "friend" }),
    ];
    expect(getEraTitle(relationships, [], 2021)).toBe("Your work era");
  });
});
