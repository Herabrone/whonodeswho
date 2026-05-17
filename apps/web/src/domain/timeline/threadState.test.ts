import { describe, expect, it } from "vitest";
import type {
  RelationshipEpisode,
  RelationshipEvent,
  RelationshipThread,
} from "../../types";
import { getThreadStateAtDate } from "./threadState";

const thread: RelationshipThread = {
  id: "thread:a:b",
  personAId: "a",
  personBId: "b",
  createdAt: "2018-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

function episode(overrides: Partial<RelationshipEpisode>): RelationshipEpisode {
  return {
    id: overrides.id ?? "episode-1",
    threadId: thread.id,
    kind: overrides.kind ?? "friend",
    startDate: overrides.startDate ?? "2019-01-01",
    certainty: overrides.certainty ?? "exact",
    source: overrides.source ?? "user",
    ...overrides,
  };
}

const canonicalEpisodes = [
  episode({
    id: "coworker",
    kind: "coworker",
    startDate: "2018-01-01",
    endDate: "2021-01-01",
  }),
  episode({ id: "friend", kind: "friend", startDate: "2019-01-01" }),
  episode({ id: "partner", kind: "romantic_partner", startDate: "2024-01-01" }),
];

describe("getThreadStateAtDate", () => {
  it("derives the canonical coworker/friend/partner scenario", () => {
    const state2018 = getThreadStateAtDate(thread, canonicalEpisodes, [], "2018-06-01");
    expect(state2018.displayLabel).toBe("Coworker");
    expect(state2018.displayCategory).toBe("work");
    expect(state2018.edgeStyle).toBe("solid");

    const state2020 = getThreadStateAtDate(thread, canonicalEpisodes, [], "2020-06-01");
    expect(state2020.displayLabel).toBe("Coworker + Friend");
    expect(state2020.displayCategory).toBe("friend");
    expect(state2020.edgeStyle).toBe("multi");
    expect(state2020.badges).toEqual(["Coworker", "Friend"]);

    const state2022 = getThreadStateAtDate(thread, canonicalEpisodes, [], "2022-06-01");
    expect(state2022.displayLabel).toBe("Friend");
    expect(state2022.displayCategory).toBe("friend");
    expect(state2022.edgeStyle).toBe("solid");

    const state2025 = getThreadStateAtDate(thread, canonicalEpisodes, [], "2025-06-01");
    expect(state2025.displayLabel).toBe("Friend + Partner");
    expect(state2025.displayCategory).toBe("romantic");
    expect(state2025.edgeStyle).toBe("multi");
  });

  it("renders an ended-only thread as dashed", () => {
    const state = getThreadStateAtDate(
      thread,
      [episode({ id: "ended", startDate: "2018-01-01", endDate: "2020-01-01" })],
      [],
      "2022-01-01",
    );

    expect(state.visibility).toBe("ended");
    expect(state.edgeStyle).toBe("dashed");
  });

  it("marks future-only threads as future with a ghost edge style", () => {
    const state = getThreadStateAtDate(
      thread,
      [episode({ id: "future", startDate: "2030-01-01" })],
      [],
      "2025-01-01",
    );

    expect(state.visibility).toBe("future");
    expect(state.edgeStyle).toBe("ghost");
  });

  it("tracks last and next changes from episodes and stored events", () => {
    const events: RelationshipEvent[] = [{
      id: "event-1",
      threadId: thread.id,
      date: "2023-05-01",
      type: "milestone",
      title: "Moved cities",
    }];

    const state = getThreadStateAtDate(thread, canonicalEpisodes, events, "2022-06-01");

    expect(state.lastChangedAt).toBe("2021-01-01");
    expect(state.nextChangeAt).toBe("2023-05-01");
  });
});
