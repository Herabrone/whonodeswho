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
});
