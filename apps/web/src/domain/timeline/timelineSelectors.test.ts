import { describe, expect, it } from "vitest";
import type { GraphData, Relationship, RelationshipPhase } from "../../types";
import {
  selectEpisodesForThread,
  selectTimelineData,
  selectTimelineMarkers,
  selectTimelineRange,
} from "./timelineSelectors";

function phase(overrides: Partial<RelationshipPhase>): RelationshipPhase {
  return {
    type: overrides.type ?? "friend",
    category: overrides.category ?? "friend",
    fromYear: overrides.fromYear ?? 2017,
    ...(overrides.fromMonth !== undefined ? { fromMonth: overrides.fromMonth } : {}),
    ...(overrides.toYear !== undefined ? { toYear: overrides.toYear } : {}),
    ...(overrides.toMonth !== undefined ? { toMonth: overrides.toMonth } : {}),
    isCurrent: overrides.isCurrent ?? false,
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
    ...(overrides.phases ? { phases: overrides.phases } : {}),
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
  };
}

function graph(relationships: Relationship[]): GraphData {
  return {
    people: [
      { id: "p1", name: "Alice", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
      { id: "p2", name: "Bob", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
    ],
    relationships,
  };
}

describe("timeline selectors", () => {
  it("builds markers from derived episodes rather than legacy rows when phases exist", () => {
    const markers = selectTimelineMarkers(graph([
      relationship({
        id: "r1",
        type: "friend",
        category: "friend",
        startYear: 1990,
        phases: [phase({ type: "coworker", category: "work", fromYear: 2016, toYear: 2018 })],
      }),
    ]));

    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      id: "r1:phase:0",
      label: "coworker",
      category: "work",
      startYear: 2016,
      endYear: 2018,
    });
  });

  it("derives the timeline range from all episode years", () => {
    const range = selectTimelineRange(graph([
      relationship({
        id: "r1",
        phases: [phase({ type: "coworker", category: "work", fromYear: 2016, toYear: 2018 })],
      }),
      relationship({ id: "r2", source: "p1", target: "p2", type: "friend", category: "friend", startYear: 2020 }),
    ]));

    expect(range).toEqual({ min: 2016, max: new Date().getFullYear() });
  });

  it("returns episodes grouped by thread and exposes combined timeline data", () => {
    const graphData = graph([
      relationship({ id: "r1", type: "coworker", category: "work", startYear: 2016, endYear: 2018 }),
      relationship({ id: "r2", type: "friend", category: "friend", startYear: 2017 }),
    ]);

    const timelineData = selectTimelineData(graphData);
    const threadEpisodes = selectEpisodesForThread(graphData, "p1::p2");

    expect(timelineData.threads).toHaveLength(1);
    expect(timelineData.episodes).toHaveLength(2);
    expect(threadEpisodes.map((episode) => episode.label)).toEqual(["coworker", "friend"]);
  });
});