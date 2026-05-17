import { describe, expect, it } from "vitest";
import type { RelationshipEpisode, RelationshipEvent } from "../../types";
import { getTimelineMarkers } from "./timelineMarkers";

describe("timeline markers", () => {
  it("derives boundary markers and merges standalone events", () => {
    const episodes: RelationshipEpisode[] = [{
      id: "episode-1",
      threadId: "thread-1",
      kind: "friend",
      startDate: "2019-01-01",
      endDate: "2021-01-01",
      certainty: "exact",
      source: "user",
    }];
    const events: RelationshipEvent[] = [{
      id: "event-1",
      threadId: "thread-1",
      date: "2020-01-01",
      type: "milestone",
      title: "Reconnected",
    }];

    expect(getTimelineMarkers(episodes, events)).toEqual([
      {
        date: "2019-01-01",
        kind: "episode_start",
        label: "Started Friend",
        episodeId: "episode-1",
      },
      {
        date: "2020-01-01",
        kind: "stored_event",
        label: "Reconnected",
        eventId: "event-1",
      },
      {
        date: "2021-01-01",
        kind: "episode_end",
        label: "Ended Friend",
        episodeId: "episode-1",
      },
    ]);
  });
});
