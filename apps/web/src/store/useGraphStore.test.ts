import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGraphStore } from "./useGraphStore";

const mockStore = {
  load: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
};

const mockDraftStore = {
  load: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
};

vi.mock("./httpStore", () => ({
  createPersistenceStore: () => mockStore,
}));

vi.mock("./localStorageStore", () => ({
  createDraftStore: () => mockDraftStore,
}));

function persistedLayout(overrides: Record<string, unknown> = {}) {
  return {
    layoutMode: "free",
    treeShape: "grouped",
    treeRootId: null,
    familyAwareLayered: true,
    ...overrides,
  };
}

describe("useGraphStore http persistence", () => {
  beforeEach(() => {
    useGraphStore.getState().signOut();
    vi.clearAllMocks();
    mockDraftStore.load.mockResolvedValue(null);
  });

  it("hydrates state for a specific user", async () => {
    const mockData = {
      graph: { people: [{ id: "p1", name: "Alice" }], relationships: [] },
      positions: { p1: { x: 0, y: 0 } },
      layout: persistedLayout({ treeShape: "radial", familyAwareLayered: false }),
    };
    mockStore.load.mockResolvedValueOnce(mockData);

    await useGraphStore.getState().hydrate("user-1");

    const s = useGraphStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.people).toHaveLength(1);
    expect(s.people[0].name).toBe("Alice");
    expect(s.familyAwareLayered).toBe(false);
    expect(s._persistence).toBe(mockStore);
  });

  it("defaults familyAwareLayered to true for older persisted layouts", async () => {
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [], relationships: [] },
      positions: {},
      layout: { layoutMode: "free", treeShape: "grouped", treeRootId: null },
    } as any);

    await useGraphStore.getState().hydrate("user-1");

    expect(useGraphStore.getState().familyAwareLayered).toBe(true);
  });

  it("routes saves through the assigned persistence instance", async () => {
    vi.useFakeTimers();
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [], relationships: [] },
      positions: {},
      layout: persistedLayout(),
    });

    await useGraphStore.getState().hydrate("user-1");
    useGraphStore.getState().addPerson({ name: "Bob" });
    vi.advanceTimersByTime(500);

    expect(mockStore.save).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("persists familyAwareLayered changes through the assigned persistence instance", async () => {
    vi.useFakeTimers();
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [], relationships: [] },
      positions: {},
      layout: persistedLayout({
        layoutMode: "tree",
        treeShape: "layered",
      }),
    });

    await useGraphStore.getState().hydrate("user-1");
    useGraphStore.getState().setFamilyAwareLayered(false);
    vi.advanceTimersByTime(500);

    expect(mockStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          familyAwareLayered: false,
        }),
      }),
    );
    vi.useRealTimers();
  });

  it("clears state on signOut", async () => {
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [{ id: "p1", name: "Alice" }], relationships: [] },
      positions: {},
      layout: persistedLayout(),
    });

    await useGraphStore.getState().hydrate("user-1");
    expect(useGraphStore.getState().people).toHaveLength(1);

    useGraphStore.getState().signOut();

    const s = useGraphStore.getState();
    expect(s.people).toHaveLength(0);
    expect(s.hydrated).toBe(false);
    expect(s._persistence).toBeNull();
  });

  it("flushes pending saves immediately", async () => {
    vi.useFakeTimers();
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [], relationships: [] },
      positions: {},
      layout: persistedLayout(),
    });

    await useGraphStore.getState().hydrate("user-1");
    useGraphStore.getState().addPerson({ name: "Casey" });

    await useGraphStore.getState().flushPersistence();

    expect(mockStore.save).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(mockStore.save).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("stores a recovery draft when persistence fails", async () => {
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [], relationships: [] },
      positions: {},
      layout: persistedLayout(),
    });
    mockStore.save.mockRejectedValueOnce(new Error("boom"));

    await useGraphStore.getState().hydrate("user-1");
    useGraphStore.getState().addPerson({ name: "Dana" });

    await expect(useGraphStore.getState().flushPersistence()).rejects.toThrow("boom");
    expect(mockDraftStore.save).toHaveBeenCalledTimes(1);
    expect(useGraphStore.getState().persistenceError).toContain("saved locally");
  });

  it("loads a recovery draft during hydrate", async () => {
    const recoveryDraft = {
      state: {
        graph: {
          people: [{ id: "p2", name: "Robin" }],
          relationships: [],
        },
        positions: {},
        layout: persistedLayout(),
      },
      updatedAt: "2024-03-01T00:00:00.000Z",
      reason: "unauthorized" as const,
    };
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [], relationships: [] },
      positions: {},
      layout: persistedLayout(),
    });
    mockDraftStore.load.mockResolvedValueOnce(recoveryDraft);

    await useGraphStore.getState().hydrate("user-1");

    expect(useGraphStore.getState().recoveryDraft).toEqual(recoveryDraft);
  });

  it("restores a recovery draft back to the server", async () => {
    const recoveryDraft = {
      state: {
        graph: {
          people: [{ id: "p3", name: "Jordan" }],
          relationships: [],
        },
        positions: {},
        layout: persistedLayout(),
      },
      updatedAt: "2024-03-01T00:00:00.000Z",
      reason: "network" as const,
    };
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [], relationships: [] },
      positions: {},
      layout: persistedLayout(),
    });
    mockDraftStore.load.mockResolvedValueOnce(recoveryDraft);

    await useGraphStore.getState().hydrate("user-1");
    await useGraphStore.getState().restoreRecoveryDraft();

    expect(useGraphStore.getState().people[0].name).toBe("Jordan");
    expect(mockStore.save).toHaveBeenCalledWith(recoveryDraft.state);
    expect(mockDraftStore.clear).toHaveBeenCalledTimes(1);
    expect(useGraphStore.getState().recoveryDraft).toBeNull();
  });

  it("opens the timeline at the earliest known start year", () => {
    useGraphStore.setState({
      relationships: [
        {
          id: "r1",
          source: "p1",
          target: "p2",
          type: "friend",
          category: "friend",
          direction: "two-way",
          startYear: 2019,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "r2",
          source: "p2",
          target: "p3",
          type: "coworker",
          category: "work",
          direction: "two-way",
          startYear: 2016,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    useGraphStore.getState().openTimeline();

    const s = useGraphStore.getState();
    expect(s.timelineOpen).toBe(true);
    expect(s.timelineYear).toBe(2016);
  });

  it("falls back when opening the timeline with no dated relationships", () => {
    const currentYear = new Date().getFullYear();
    useGraphStore.setState({
      relationships: [
        {
          id: "r1",
          source: "p1",
          target: "p2",
          type: "friend",
          category: "friend",
          direction: "two-way",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    useGraphStore.getState().openTimeline();

    expect(useGraphStore.getState().timelineYear).toBe(currentYear - 5);
  });

  it("supports updater functions for timeline year", () => {
    useGraphStore.setState({ timelineYear: 2020 });

    useGraphStore.getState().setTimelineYear((prev) => prev + 1.5);

    expect(useGraphStore.getState().timelineYear).toBe(2021.5);
  });

  it("closes the timeline and stops playback", () => {
    useGraphStore.setState({ timelineOpen: true, timelinePlaying: true });

    useGraphStore.getState().closeTimeline();

    const s = useGraphStore.getState();
    expect(s.timelineOpen).toBe(false);
    expect(s.timelinePlaying).toBe(false);
  });

  it("marks a relationship as ended", () => {
    const currentYear = new Date().getFullYear();
    useGraphStore.setState({
      relationships: [
        {
          id: "r1",
          source: "p1",
          target: "p2",
          type: "friend",
          category: "friend",
          direction: "two-way",
          isActive: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    useGraphStore.getState().endRelationship("r1");

    const relationship = useGraphStore.getState().relationships[0];
    expect(relationship.isActive).toBe(false);
    expect(relationship.endYear).toBe(currentYear);
  });

  it("auto-creates a reciprocal relationship for mapped asymmetric types", () => {
    const parent = useGraphStore.getState().addRelationship({
      source: "alice",
      target: "bob",
      type: "parent",
      category: "family",
      direction: "one-way",
    });

    expect(useGraphStore.getState().relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: parent.id,
          source: "alice",
          target: "bob",
          type: "parent",
        }),
        expect.objectContaining({
          source: "bob",
          target: "alice",
          type: "child",
          category: "family",
          direction: "one-way",
          autoCreatedReciprocalOfId: parent.id,
        }),
      ]),
    );
  });

  it("supports gendered asymmetric labels without duplicating an existing reciprocal", () => {
    useGraphStore.setState({
      relationships: [
        {
          id: "existing-nephew",
          source: "bob",
          target: "alice",
          type: "nephew",
          category: "family",
          direction: "one-way",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    const aunt = useGraphStore.getState().addRelationship({
      source: "alice",
      target: "bob",
      type: "uncle",
      category: "family",
      direction: "one-way",
    });

    const relationships = useGraphStore.getState().relationships;
    expect(relationships).toHaveLength(2);
    expect(relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: aunt.id, type: "uncle" }),
        expect.objectContaining({ id: "existing-nephew", type: "nephew" }),
      ]),
    );
  });

  it("deletes only the auto-created reciprocal when the original is removed", () => {
    const original = useGraphStore.getState().addRelationship({
      source: "alice",
      target: "bob",
      type: "grandparent",
      category: "family",
      direction: "one-way",
    });

    const reciprocal = useGraphStore
      .getState()
      .relationships.find((relationship) => relationship.autoCreatedReciprocalOfId === original.id);

    expect(reciprocal).toBeDefined();

    useGraphStore.getState().deleteRelationship(original.id);

    expect(useGraphStore.getState().relationships).toHaveLength(0);
  });

  it("syncs legacy relationship fields after a transition and only updates the targeted relationship", () => {
    const threadId = "thread:alice:bob";
    useGraphStore.setState({
      people: [
        {
          id: "alice",
          name: "Alice",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "bob",
          name: "Bob",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      relationships: [
        {
          id: "r1",
          source: "alice",
          target: "bob",
          type: "partner",
          category: "romantic",
          direction: "two-way",
          startYear: 2015,
          startMonth: 6,
          isActive: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "r2",
          source: "bob",
          target: "alice",
          type: "child",
          category: "family",
          direction: "one-way",
          autoCreatedReciprocalOfId: "r-parent",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      threads: {
        [threadId]: {
          id: threadId,
          personAId: "alice",
          personBId: "bob",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      },
      episodes: {
        "episode:r1": {
          id: "episode:r1",
          threadId,
          kind: "romantic_partner",
          startDate: "2015-06-01",
          certainty: "approximate",
          source: "imported",
        },
      },
      events: {},
    });

    const result = useGraphStore.getState().applyTransition(
      threadId,
      {
        closedEpisodeId: "episode:r1",
        transitionDate: "2023-09-01",
        newEpisode: {
          kind: "ex_partner",
          certainty: "approximate",
        },
        event: {
          type: "milestone",
          title: "Broke up",
        },
      },
      "r1",
    );

    expect(result.ok).toBe(true);

    const state = useGraphStore.getState();
    const transitioned = state.relationships.find((relationship) => relationship.id === "r1");
    const untouched = state.relationships.find((relationship) => relationship.id === "r2");

    expect(transitioned).toEqual(
      expect.objectContaining({
        type: "ex-partner",
        isActive: true,
        startYear: 2023,
        startMonth: 9,
        endYear: 2023,
      }),
    );

    expect(untouched).toEqual(
      expect.objectContaining({
        id: "r2",
        type: "child",
        autoCreatedReciprocalOfId: "r-parent",
      }),
    );
  });

  it("leaves symmetric relationship types unchanged", () => {
    useGraphStore.getState().addRelationship({
      source: "alice",
      target: "bob",
      type: "sibling",
      category: "family",
      direction: "two-way",
    });

    expect(useGraphStore.getState().relationships).toHaveLength(1);
    expect(useGraphStore.getState().relationships[0]).toEqual(
      expect.objectContaining({
        source: "alice",
        target: "bob",
        type: "sibling",
      }),
    );
  });

  it("resyncs an open imported episode when legacy relationship dates drift", () => {
    const threadId = "thread:alice:bob";
    useGraphStore.setState({
      relationships: [
        {
          id: "r1",
          source: "alice",
          target: "bob",
          type: "partner",
          category: "romantic",
          direction: "two-way",
          startYear: 2015,
          startMonth: 6,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      threads: {
        [threadId]: {
          id: threadId,
          personAId: "alice",
          personBId: "bob",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      },
      episodes: {
        "episode:r1": {
          id: "episode:r1",
          threadId,
          kind: "romantic_partner",
          startDate: "2026-01-01",
          certainty: "unknown",
          source: "imported",
        },
      },
      events: {},
    });

    const relationship = useGraphStore.getState().relationships[0]!;
    useGraphStore.getState().ensureLegacyRelationshipMigrated(relationship);

    expect(useGraphStore.getState().episodes["episode:r1"]).toEqual(
      expect.objectContaining({
        id: "episode:r1",
        threadId,
        kind: "romantic_partner",
        startDate: "2015-06-01",
        certainty: "exact",
        source: "imported",
      }),
    );
  });

  it("does not resync a closed imported episode", () => {
    const threadId = "thread:alice:bob";
    useGraphStore.setState({
      relationships: [
        {
          id: "r1",
          source: "alice",
          target: "bob",
          type: "partner",
          category: "romantic",
          direction: "two-way",
          startYear: 2026,
          startMonth: 1,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      threads: {
        [threadId]: {
          id: threadId,
          personAId: "alice",
          personBId: "bob",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      },
      episodes: {
        "episode:r1": {
          id: "episode:r1",
          threadId,
          kind: "romantic_partner",
          startDate: "2015-06-01",
          endDate: "2023-09-01",
          certainty: "exact",
          source: "imported",
        },
      },
      events: {},
    });

    const relationship = useGraphStore.getState().relationships[0]!;
    useGraphStore.getState().ensureLegacyRelationshipMigrated(relationship);

    expect(useGraphStore.getState().episodes["episode:r1"]).toEqual(
      expect.objectContaining({
        startDate: "2015-06-01",
        endDate: "2023-09-01",
      }),
    );
  });

  it("migrates reciprocal relationships to the canonical timeline episode", () => {
    useGraphStore.setState({
      relationships: [
        {
          id: "r1",
          source: "alice",
          target: "bob",
          type: "parent",
          category: "family",
          direction: "one-way",
          startYear: 2014,
          startMonth: 2,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "r2",
          source: "bob",
          target: "alice",
          type: "child",
          category: "family",
          direction: "one-way",
          autoCreatedReciprocalOfId: "r1",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      threads: {},
      episodes: {},
      events: {},
    });

    const reciprocal = useGraphStore
      .getState()
      .relationships.find((relationship) => relationship.id === "r2");

    expect(reciprocal).toBeDefined();
    useGraphStore.getState().ensureLegacyRelationshipMigrated(reciprocal!);

    const episodes = useGraphStore.getState().episodes;
    expect(episodes["episode:r1"]).toBeDefined();
    expect(episodes["episode:r2"]).toBeUndefined();
    expect(episodes["episode:r1"]).toEqual(
      expect.objectContaining({
        startDate: "2014-02-01",
      }),
    );
  });
});
