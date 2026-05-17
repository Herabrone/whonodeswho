import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGraphStore } from "./useGraphStore";

// Minimal mock for persistence
const mockStore = {
  load: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
};

vi.mock("./httpStore", () => ({
  createPersistenceStore: () => mockStore,
}));

describe("useGraphStore http persistence", () => {
  beforeEach(() => {
    // Reset Zustand store state manually if needed, or rely on signOut()
    useGraphStore.getState().signOut();
    vi.clearAllMocks();
  });

  it("hydrates state for a specific user", async () => {
    const mockData = {
      graph: { people: [{ id: "p1", name: "Alice" }], relationships: [] },
      positions: { p1: { x: 0, y: 0 } },
      layout: { layoutMode: "free", treeShape: "radial", treeRootId: null },
    };
    mockStore.load.mockResolvedValueOnce(mockData);

    await useGraphStore.getState().hydrate();

    const s = useGraphStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.people).toHaveLength(1);
    expect(s.people[0].name).toBe("Alice");
    expect(s._persistence).toBe(mockStore);
  });

  it("routes saves through the assigned persistence instance", async () => {
    vi.useFakeTimers();
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [], relationships: [] },
      positions: {},
      layout: { layoutMode: "free", treeShape: "grouped", treeRootId: null },
    });

    await useGraphStore.getState().hydrate();
    
    // Trigger a change
    useGraphStore.getState().addPerson({ name: "Bob" });

    // Fast-forward debounce timer (400ms)
    vi.advanceTimersByTime(500);

    expect(mockStore.save).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("clears state on signOut", async () => {
    mockStore.load.mockResolvedValueOnce({
      graph: { people: [{ id: "p1", name: "Alice" }], relationships: [] },
      positions: {},
      layout: { layoutMode: "free", treeShape: "grouped", treeRootId: null },
    });

    await useGraphStore.getState().hydrate();
    expect(useGraphStore.getState().people).toHaveLength(1);

    useGraphStore.getState().signOut();

    const s = useGraphStore.getState();
    expect(s.people).toHaveLength(0);
    expect(s.hydrated).toBe(false);
    expect(s._persistence).toBeNull();
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
});
