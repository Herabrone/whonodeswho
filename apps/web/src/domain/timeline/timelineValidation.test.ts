import { describe, expect, it } from "vitest";
import type { RelationshipHistoryGraphData } from "../../types";
import { validateTimelineGraph } from "./timelineValidation";

function graph(): RelationshipHistoryGraphData {
  return {
    people: [],
    threads: {
      "thread-1": {
        id: "thread-1",
        personAId: "a",
        personBId: "b",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    },
    episodes: {},
    events: {},
  };
}

describe("timeline validation", () => {
  it("rejects episodes whose end date is before the start date", () => {
    const value = graph();
    value.episodes["episode-1"] = {
      id: "episode-1",
      threadId: "thread-1",
      kind: "friend",
      startDate: "2022-01-01",
      endDate: "2021-01-01",
      certainty: "exact",
      source: "user",
    };

    expect(validateTimelineGraph(value)).toContainEqual(expect.objectContaining({
      severity: "fatal",
      code: "end-before-start",
    }));
  });

  it("warns for overlapping spouse episodes", () => {
    const value = graph();
    value.episodes["episode-1"] = {
      id: "episode-1",
      threadId: "thread-1",
      kind: "spouse",
      startDate: "2020-01-01",
      endDate: "2024-01-01",
      certainty: "exact",
      source: "user",
    };
    value.episodes["episode-2"] = {
      id: "episode-2",
      threadId: "thread-1",
      kind: "spouse",
      startDate: "2022-01-01",
      certainty: "exact",
      source: "user",
    };

    expect(validateTimelineGraph(value)).toContainEqual(expect.objectContaining({
      severity: "warning",
      code: "overlapping-spouse",
    }));
  });

  it("rejects duplicate equal episodes", () => {
    const value = graph();
    value.episodes["episode-1"] = {
      id: "episode-1",
      threadId: "thread-1",
      kind: "friend",
      startDate: "2020-01-01",
      certainty: "exact",
      source: "user",
    };
    value.episodes["episode-2"] = {
      id: "episode-2",
      threadId: "thread-1",
      kind: "friend",
      startDate: "2020-01-01",
      certainty: "exact",
      source: "user",
    };

    expect(validateTimelineGraph(value)).toContainEqual(expect.objectContaining({
      severity: "fatal",
      code: "duplicate-episode",
    }));
  });
});
