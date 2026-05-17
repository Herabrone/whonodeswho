/**
 * whoNodeswho — GLOBAL STORE  (THE INTEGRATION CONTRACT)
 * =======================================================
 * Every parallel track integrates through this store and ONLY through this
 * store. All state slices and actions are declared here in Phase 0 so that:
 *   - Track A (CRUD)        calls data actions + reads selection
 *   - Track B (Intelligence) calls focus/path actions + reads data
 *   - Track C (Filtering)    calls view actions + reads data
 * ...without any track editing this file. DO NOT add track-specific logic
 * here; build it in src/features/<track>/ and drive it through these actions.
 *
 * State persists automatically (debounced) via the persistence contract.
 */
import { create, type StateCreator } from "zustand";
import type {
  FocusDegrees,
  GraphData,
  LayoutMode,
  Person,
  PersonInput,
  Relationship,
  RelationshipCategory,
  RelationshipInput,
  TreeShape,
  XYPosition,
} from "../types";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  RELATIONSHIP_CATALOG,
} from "../constants";
import { newId, nowIso } from "../lib/id";
import { createPersistenceStore } from "./httpStore";
import { ApiRequestError } from "../lib/apiClient";
import { createDraftStore } from "./localStorageStore";
import {
  EMPTY_STATE,
  type DraftFailureReason,
  type DraftStore,
  type PersistedDraft,
  type RelationshipStore,
} from "./persistence";
import type { PersistedState } from "../types";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface DataSlice {
  people: Person[];
  relationships: Relationship[];
  positions: Record<string, XYPosition>;
  // Legend State
  categoryLabels: Record<RelationshipCategory, string>;
  relationshipColors: Record<RelationshipCategory, string>;
  relationshipCatalog: Record<RelationshipCategory, string[]>;
}

interface SelectionSlice {
  selectedPersonId: string | null;
  selectedRelationshipId: string | null;
}

/** Written by Track C. Read by the graph view. */
interface ViewSlice {
  visibleCategories: RelationshipCategory[];
  showLabels: boolean;
  hideWeak: boolean;
  searchQuery: string;
}

/** Written by Track B. Read by the graph view. */
interface FocusSlice {
  focusPersonId: string | null;
  focusDegrees: FocusDegrees;
  /** Ordered person ids of the active degrees-of-separation path (or []). */
  pathPersonIds: string[];
}

interface LayoutSlice {
  layoutMode: LayoutMode;
  treeShape: TreeShape;
  treeRootId: string | null;
}

interface TimelineSlice {
  timelineOpen: boolean;
  timelineYear: number;
  timelinePlaying: boolean;
  timelineSpeed: 1 | 2 | 3;
}

interface Lifecycle {
  hydrated: boolean;
  _persistence: RelationshipStore | null;
  _drafts: DraftStore | null;
  persistenceError: string | null;
  recoveryDraft: PersistedDraft | null;
}

export interface GraphStore
  extends DataSlice,
    SelectionSlice,
    ViewSlice,
    FocusSlice,
    LayoutSlice,
    TimelineSlice,
    Lifecycle {
  // -- lifecycle --
  hydrate: (userId: string) => Promise<void>;
  flushPersistence: () => Promise<void>;
  saveDraft: (reason?: DraftFailureReason) => Promise<void>;
  restoreRecoveryDraft: () => Promise<void>;
  discardRecoveryDraft: () => Promise<void>;
  clearPersistenceError: () => void;
  signOut: () => void;

  // -- data actions (Track A) --
  addPerson: (input: PersonInput) => Person;
  updatePerson: (id: string, patch: Partial<PersonInput>) => void;
  deletePerson: (id: string) => void;
  addRelationship: (input: RelationshipInput) => Relationship;
  updateRelationship: (id: string, patch: Partial<RelationshipInput>) => void;
  deleteRelationship: (id: string) => void;
  replaceGraph: (graph: GraphData) => void;
  setPosition: (personId: string, pos: XYPosition) => void;

  // -- selection actions (any track / Phase 0 canvas) --
  selectPerson: (id: string | null) => void;
  selectRelationship: (id: string | null) => void;
  clearSelection: () => void;

  // -- view actions (Track C) --
  setVisibleCategories: (categories: RelationshipCategory[]) => void;
  toggleCategory: (category: RelationshipCategory) => void;
  setShowLabels: (value: boolean) => void;
  setHideWeak: (value: boolean) => void;
  setSearchQuery: (query: string) => void;
  resetView: () => void;

  // -- focus actions (Track B) --
  setFocus: (personId: string | null, degrees?: FocusDegrees) => void;
  setFocusDegrees: (degrees: FocusDegrees) => void;
  clearFocus: () => void;
  setPath: (personIds: string[]) => void;
  clearPath: () => void;

  // -- layout actions (Phase 0.1) --
  setLayoutMode: (mode: LayoutMode) => void;
  setTreeShape: (shape: TreeShape) => void;
  setTreeRoot: (personId: string | null) => void;

  // -- timeline actions (Timeline feature) --
  openTimeline: () => void;
  closeTimeline: () => void;
  setTimelineYear: (value: number | ((prev: number) => number)) => void;
  setTimelinePlaying: (value: boolean) => void;
  setTimelineSpeed: (speed: 1 | 2 | 3) => void;
  endRelationship: (id: string) => void;

  // -- legend actions (Contract Amendment) --
  updateCategoryLabel: (category: RelationshipCategory, label: string) => void;
  updateCategoryColor: (category: RelationshipCategory, color: string) => void;
  addRelationshipType: (category: RelationshipCategory, type: string) => void;
  removeRelationshipType: (category: RelationshipCategory, type: string) => void;
}

type GraphStoreSet = Parameters<StateCreator<GraphStore>>[0];

// ---------------------------------------------------------------------------
// Debounced persistence
// ---------------------------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function clearScheduledSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

function buildPersistedState(state: GraphStore): PersistedState {
  return {
    graph: {
      people: state.people,
      relationships: state.relationships,
    },
    positions: state.positions,
    layout: {
      layoutMode: state.layoutMode,
      treeShape: state.treeShape,
      treeRootId: state.treeRootId,
    },
  };
}

function getPersistenceErrorMessage(reason: DraftFailureReason) {
  if (reason === "unauthorized") {
    return "Session expired. Your latest graph edits were saved locally for recovery.";
  }

  if (reason === "lifecycle") {
    return "A local draft was captured while the page was closing. You can restore it after signing back in.";
  }

  return "Graph changes could not reach the server. Your latest edits were saved locally for recovery.";
}

function getDraftFailureReason(error: unknown): DraftFailureReason {
  if (error instanceof ApiRequestError && error.status === 401) {
    return "unauthorized";
  }

  if (error instanceof TypeError) {
    return "network";
  }

  return "unknown";
}

function setPersistedSlices(
  set: GraphStoreSet,
  persisted: PersistedState,
) {
  set({
    people: persisted.graph.people,
    relationships: persisted.graph.relationships,
    positions: persisted.positions,
    layoutMode: persisted.layout.layoutMode,
    treeShape: persisted.layout.treeShape,
    treeRootId: persisted.layout.treeRootId,
    selectedPersonId: null,
    selectedRelationshipId: null,
    focusPersonId: null,
    pathPersonIds: [],
  });
}

async function saveDraft(
  get: () => GraphStore,
  set: GraphStoreSet,
  reason: DraftFailureReason,
  exposeRecovery = false,
) {
  const drafts = get()._drafts;
  if (!drafts) return;

  const draft: PersistedDraft = {
    state: buildPersistedState(get()),
    updatedAt: new Date().toISOString(),
    reason,
  };

  await drafts.save(draft);
  set({
    persistenceError: getPersistenceErrorMessage(reason),
    recoveryDraft: exposeRecovery ? draft : get().recoveryDraft,
  });
}

async function flushPersistence(
  get: () => GraphStore,
  set: GraphStoreSet,
) {
  clearScheduledSave();
  const persistence = get()._persistence;
  if (!persistence) return;

  try {
    await persistence.save(buildPersistedState(get()));
    if (get()._drafts) {
      await get()._drafts!.clear();
    }
    set({ persistenceError: null, recoveryDraft: null });
  } catch (error) {
    const reason = getDraftFailureReason(error);
    await saveDraft(get, set, reason);
    throw error;
  }
}

function scheduleSave(
  get: () => GraphStore,
  set: GraphStoreSet,
) {
  const persistence = get()._persistence;
  clearScheduledSave();
  if (!persistence) return;

  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushPersistence(get, set).catch((error) => {
      console.error("[useGraphStore] save failed:", error);
    });
  }, 400);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const VIEW_DEFAULTS: ViewSlice = {
  visibleCategories: [...CATEGORIES],
  showLabels: true,
  hideWeak: false,
  searchQuery: "",
};

const LEGEND_DEFAULTS = {
  categoryLabels: { ...CATEGORY_LABELS },
  relationshipColors: { ...CATEGORY_COLORS },
  relationshipCatalog: { ...RELATIONSHIP_CATALOG },
};

const LAYOUT_DEFAULTS: LayoutSlice = {
  layoutMode: "free",
  treeShape: "grouped",
  treeRootId: null,
};

const getCurrentYear = () => new Date().getFullYear();

const TIMELINE_DEFAULTS: TimelineSlice = {
  timelineOpen: false,
  timelineYear: getCurrentYear(),
  timelinePlaying: false,
  timelineSpeed: 1,
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  // initial state
  people: [],
  relationships: [],
  positions: {},
  selectedPersonId: null,
  selectedRelationshipId: null,
  ...VIEW_DEFAULTS,
  ...LEGEND_DEFAULTS,
  ...LAYOUT_DEFAULTS,
  ...TIMELINE_DEFAULTS,
  focusPersonId: null,
  focusDegrees: 1,
  pathPersonIds: [],
  hydrated: false,
  _persistence: null,
  _drafts: null,
  persistenceError: null,
  recoveryDraft: null,

  // -- lifecycle --
  hydrate: async (userId) => {
    const store = createPersistenceStore();
    const drafts = createDraftStore(userId);
    const [persisted, draft] = await Promise.all([
      store.load().catch(() => EMPTY_STATE),
      drafts.load().catch(() => null),
    ]);

    set({
      people: persisted.graph.people,
      relationships: persisted.graph.relationships,
      positions: persisted.positions,
      layoutMode: persisted.layout?.layoutMode ?? LAYOUT_DEFAULTS.layoutMode,
      treeShape: persisted.layout?.treeShape ?? LAYOUT_DEFAULTS.treeShape,
      treeRootId: persisted.layout?.treeRootId ?? LAYOUT_DEFAULTS.treeRootId,
      hydrated: true,
      _persistence: store,
      _drafts: drafts,
      persistenceError:
        draft?.reason === "lifecycle"
          ? getPersistenceErrorMessage(draft.reason)
          : null,
      recoveryDraft: draft,
    });
  },

  flushPersistence: async () => {
    await flushPersistence(get, set);
  },

  saveDraft: async (reason = "unknown") => {
    await saveDraft(get, set, reason);
  },

  restoreRecoveryDraft: async () => {
    const draft = get().recoveryDraft;
    if (!draft) return;

    setPersistedSlices(set, draft.state);
    await flushPersistence(get, set);
  },

  discardRecoveryDraft: async () => {
    const drafts = get()._drafts;
    if (drafts) {
      await drafts.clear();
    }
    set({ recoveryDraft: null, persistenceError: null });
  },

  clearPersistenceError: () => {
    set({ persistenceError: null });
  },

  signOut: () => {
    clearScheduledSave();
    set({
      people: [],
      relationships: [],
      positions: {},
      selectedPersonId: null,
      selectedRelationshipId: null,
      focusPersonId: null,
      pathPersonIds: [],
      ...TIMELINE_DEFAULTS,
      hydrated: false,
      _persistence: null,
      _drafts: null,
      persistenceError: null,
      recoveryDraft: null,
    });
  },

  // -- data actions --
  addPerson: (input) => {
    const person: Person = {
      ...input,
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({ people: [...s.people, person] }));
    scheduleSave(get, set);
    return person;
  },

  updatePerson: (id, patch) => {
    set((s) => ({
      people: s.people.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p,
      ),
    }));
    scheduleSave(get, set);
  },

  deletePerson: (id) => {
    set((s) => {
      const positions = { ...s.positions };
      delete positions[id];
      return {
        people: s.people.filter((p) => p.id !== id),
        // cascade: drop relationships touching this person
        relationships: s.relationships.filter(
          (r) => r.source !== id && r.target !== id,
        ),
        positions,
        selectedPersonId:
          s.selectedPersonId === id ? null : s.selectedPersonId,
        focusPersonId: s.focusPersonId === id ? null : s.focusPersonId,
        pathPersonIds: s.pathPersonIds.includes(id) ? [] : s.pathPersonIds,
        treeRootId: s.treeRootId === id ? null : s.treeRootId,
      };
    });
    scheduleSave(get, set);
  },

  addRelationship: (input) => {
    const relationship: Relationship = {
      ...input,
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({ relationships: [...s.relationships, relationship] }));
    scheduleSave(get, set);
    return relationship;
  },

  updateRelationship: (id, patch) => {
    set((s) => ({
      relationships: s.relationships.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r,
      ),
    }));
    scheduleSave(get, set);
  },

  deleteRelationship: (id) => {
    set((s) => ({
      relationships: s.relationships.filter((r) => r.id !== id),
      selectedRelationshipId:
        s.selectedRelationshipId === id ? null : s.selectedRelationshipId,
    }));
    scheduleSave(get, set);
  },

  replaceGraph: (graph) => {
    set({
      people: graph.people,
      relationships: graph.relationships,
      // positions for unknown people are recomputed lazily by the graph view
      selectedPersonId: null,
      selectedRelationshipId: null,
      focusPersonId: null,
      pathPersonIds: [],
      treeRootId: null,
    });
    scheduleSave(get, set);
  },

  setPosition: (personId, pos) => {
    set((s) => ({ positions: { ...s.positions, [personId]: pos } }));
    scheduleSave(get, set);
  },

  // -- selection actions --
  selectPerson: (id) =>
    set({ selectedPersonId: id, selectedRelationshipId: null }),
  selectRelationship: (id) =>
    set({ selectedRelationshipId: id, selectedPersonId: null }),
  clearSelection: () =>
    set({ selectedPersonId: null, selectedRelationshipId: null }),

  // -- view actions --
  setVisibleCategories: (categories) =>
    set({ visibleCategories: categories }),
  toggleCategory: (category) =>
    set((s) => ({
      visibleCategories: s.visibleCategories.includes(category)
        ? s.visibleCategories.filter((c) => c !== category)
        : [...s.visibleCategories, category],
    })),
  setShowLabels: (value) => set({ showLabels: value }),
  setHideWeak: (value) => set({ hideWeak: value }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetView: () =>
    set({ ...VIEW_DEFAULTS, focusPersonId: null, pathPersonIds: [] }),

  // -- focus actions --
  setFocus: (personId, degrees) =>
    set((s) => ({
      focusPersonId: personId,
      focusDegrees: degrees ?? s.focusDegrees,
    })),
  setFocusDegrees: (degrees) => set({ focusDegrees: degrees }),
  clearFocus: () => set({ focusPersonId: null }),
  setPath: (personIds) => set({ pathPersonIds: personIds }),
  clearPath: () => set({ pathPersonIds: [] }),

  // -- layout actions --
  setLayoutMode: (mode) => {
    set({ layoutMode: mode });
    scheduleSave(get, set);
  },
  setTreeShape: (shape) => {
    set({ treeShape: shape });
    scheduleSave(get, set);
  },
  setTreeRoot: (personId) => {
    set({ treeRootId: personId });
    scheduleSave(get, set);
  },

  // -- timeline actions --
  openTimeline: () => {
    const years = get()
      .relationships.map((relationship) => relationship.startYear)
      .filter((year): year is number => typeof year === "number");
    const earliestYear =
      years.length > 0 ? Math.min(...years) : getCurrentYear() - 5;
    set({
      timelineOpen: true,
      timelineYear: earliestYear,
    });
  },
  closeTimeline: () => set({ timelineOpen: false, timelinePlaying: false }),
  setTimelineYear: (value) =>
    set((s) => ({
      timelineYear:
        typeof value === "function" ? value(s.timelineYear) : value,
    })),
  setTimelinePlaying: (value) => set({ timelinePlaying: value }),
  setTimelineSpeed: (speed) => set({ timelineSpeed: speed }),
  endRelationship: (id) => {
    get().updateRelationship(id, {
      endYear: getCurrentYear(),
      isActive: false,
    });
  },

  // -- legend actions --
  updateCategoryLabel: (category, label) => {
    set((s) => ({
      categoryLabels: { ...s.categoryLabels, [category]: label }
    }));
    scheduleSave(get, set);
  },
  updateCategoryColor: (category, color) => {
    set((s) => ({
      relationshipColors: { ...s.relationshipColors, [category]: color }
    }));
    scheduleSave(get, set);
  },
  addRelationshipType: (category, type) => {
    set((s) => ({
      relationshipCatalog: {
        ...s.relationshipCatalog,
        [category]: [...(s.relationshipCatalog[category] || []), type]
      }
    }));
    scheduleSave(get, set);
  },
  removeRelationshipType: (category, type) => {
    set((s) => ({
      relationshipCatalog: {
        ...s.relationshipCatalog,
        [category]: (s.relationshipCatalog[category] || []).filter(t => t !== type)
      }
    }));
    scheduleSave(get, set);
  },
}));

// ---------------------------------------------------------------------------
// Selectors — import these instead of recomputing in components.
// ---------------------------------------------------------------------------

export const selectPersonById = (id: string | null) => (s: GraphStore) =>
  id ? s.people.find((p) => p.id === id) ?? null : null;

export const selectRelationshipById =
  (id: string | null) => (s: GraphStore) =>
    id ? s.relationships.find((r) => r.id === id) ?? null : null;

/** Relationships touching a given person. */
export const selectRelationshipsOf = (personId: string) => (s: GraphStore) =>
  s.relationships.filter(
    (r) => r.source === personId || r.target === personId,
  );
