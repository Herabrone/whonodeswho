/**
 * RelationFlow — GLOBAL STORE  (THE INTEGRATION CONTRACT)
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
import { create } from "zustand";
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
import { persistenceStore } from "./localStorageStore";
import { EMPTY_STATE } from "./persistence";

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

interface Lifecycle {
  hydrated: boolean;
}

export interface GraphStore
  extends DataSlice,
    SelectionSlice,
    ViewSlice,
    FocusSlice,
    LayoutSlice,
    Lifecycle {
  // -- lifecycle --
  hydrate: () => Promise<void>;

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

  // -- legend actions (Contract Amendment) --
  updateCategoryLabel: (category: RelationshipCategory, label: string) => void;
  updateCategoryColor: (category: RelationshipCategory, color: string) => void;
  addRelationshipType: (category: RelationshipCategory, type: string) => void;
  removeRelationshipType: (category: RelationshipCategory, type: string) => void;
}

// ---------------------------------------------------------------------------
// Debounced persistence
// ---------------------------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(get: () => GraphStore) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = get();
    void persistenceStore.save({
      graph: { people: s.people, relationships: s.relationships },
      positions: s.positions,
      layout: {
        layoutMode: s.layoutMode,
        treeShape: s.treeShape,
        treeRootId: s.treeRootId,
      },
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
  focusPersonId: null,
  focusDegrees: 1,
  pathPersonIds: [],
  hydrated: false,

  // -- lifecycle --
  hydrate: async () => {
    const persisted = await persistenceStore.load().catch(() => EMPTY_STATE);
    set({
      people: persisted.graph.people,
      relationships: persisted.graph.relationships,
      positions: persisted.positions,
      layoutMode: persisted.layout?.layoutMode ?? LAYOUT_DEFAULTS.layoutMode,
      treeShape: persisted.layout?.treeShape ?? LAYOUT_DEFAULTS.treeShape,
      treeRootId: persisted.layout?.treeRootId ?? LAYOUT_DEFAULTS.treeRootId,
      hydrated: true,
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
    scheduleSave(get);
    return person;
  },

  updatePerson: (id, patch) => {
    set((s) => ({
      people: s.people.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p,
      ),
    }));
    scheduleSave(get);
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
    scheduleSave(get);
  },

  addRelationship: (input) => {
    const relationship: Relationship = {
      ...input,
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({ relationships: [...s.relationships, relationship] }));
    scheduleSave(get);
    return relationship;
  },

  updateRelationship: (id, patch) => {
    set((s) => ({
      relationships: s.relationships.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r,
      ),
    }));
    scheduleSave(get);
  },

  deleteRelationship: (id) => {
    set((s) => ({
      relationships: s.relationships.filter((r) => r.id !== id),
      selectedRelationshipId:
        s.selectedRelationshipId === id ? null : s.selectedRelationshipId,
    }));
    scheduleSave(get);
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
    scheduleSave(get);
  },

  setPosition: (personId, pos) => {
    set((s) => ({ positions: { ...s.positions, [personId]: pos } }));
    scheduleSave(get);
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
    scheduleSave(get);
  },
  setTreeShape: (shape) => {
    set({ treeShape: shape });
    scheduleSave(get);
  },
  setTreeRoot: (personId) => {
    set({ treeRootId: personId });
    scheduleSave(get);
  },

  // -- legend actions --
  updateCategoryLabel: (category, label) => {
    set((s) => ({
      categoryLabels: { ...s.categoryLabels, [category]: label }
    }));
    scheduleSave(get);
  },
  updateCategoryColor: (category, color) => {
    set((s) => ({
      relationshipColors: { ...s.relationshipColors, [category]: color }
    }));
    scheduleSave(get);
  },
  addRelationshipType: (category, type) => {
    set((s) => ({
      relationshipCatalog: {
        ...s.relationshipCatalog,
        [category]: [...(s.relationshipCatalog[category] || []), type]
      }
    }));
    scheduleSave(get);
  },
  removeRelationshipType: (category, type) => {
    set((s) => ({
      relationshipCatalog: {
        ...s.relationshipCatalog,
        [category]: (s.relationshipCatalog[category] || []).filter(t => t !== type)
      }
    }));
    scheduleSave(get);
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
