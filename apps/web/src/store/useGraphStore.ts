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
  RelationshipEpisode,
  RelationshipEvent,
  RelationshipInput,
  RelationshipThread,
  TreeShape,
  XYPosition,
} from "../types";
import type { TransitionOutcome, TransitionResult } from "../domain/timeline/transitionTypes";
import { isValidEpisodeKind } from "../domain/timeline/transitionEngine";
import {
  makeThreadId,
  normalizeThreadParticipants,
} from "../domain/timeline/timelineTypes";
import { migrateLegacyRelationshipToEpisode } from "../domain/timeline/timelineMigration";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  getReciprocalRelationshipType,
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
  familyAwareLayered: boolean;
}

interface TimelineSlice {
  timelineOpen: boolean;
  timelineYear: number;
  timelinePlaying: boolean;
  timelineSpeed: 1 | 2 | 3;
}

interface HistorySlice {
  threads: Record<string, RelationshipThread>;
  episodes: Record<string, RelationshipEpisode>;
  events: Record<string, RelationshipEvent>;
}

interface Lifecycle {
  hydrated: boolean;
  _persistence: RelationshipStore | null;
  _drafts: DraftStore | null;
  _historyKey: string | null;
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
    HistorySlice,
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
  setFamilyAwareLayered: (enabled: boolean) => void;

  // -- timeline actions (Timeline feature) --
  openTimeline: () => void;
  closeTimeline: () => void;
  setTimelineYear: (value: number | ((prev: number) => number)) => void;
  setTimelinePlaying: (value: boolean) => void;
  setTimelineSpeed: (speed: 1 | 2 | 3) => void;
  endRelationship: (id: string, endYear?: number) => void;

  // -- history actions (Temporal feature) --
  /**
   * Close one episode and optionally open a successor at the same date.
   * Creates a milestone event at the transition date.
   * Returns { ok: false, error } on validation failure.
   */
  applyTransition: (threadId: string, outcome: TransitionOutcome) => TransitionResult;
  /**
   * Ensure a legacy Relationship is represented in the HistorySlice.
   * Idempotent — safe to call multiple times for the same relationship.
   */
  ensureLegacyRelationshipMigrated: (relationship: Relationship) => { threadId: string; episodeId: string };

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

function normalizeRelationshipType(type: string): string {
  return type.trim().toLowerCase();
}

function buildRelationship(input: RelationshipInput): Relationship {
  const timestamp = nowIso();
  return {
    ...input,
    id: newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function hasRelationship(
  relationships: Relationship[],
  candidate: Pick<RelationshipInput, "source" | "target" | "type">,
): boolean {
  const normalizedType = normalizeRelationshipType(candidate.type);
  return relationships.some(
    (relationship) =>
      relationship.source === candidate.source &&
      relationship.target === candidate.target &&
      normalizeRelationshipType(relationship.type) === normalizedType,
  );
}

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
      familyAwareLayered: state.familyAwareLayered,
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
    familyAwareLayered: persisted.layout.familyAwareLayered,
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
  familyAwareLayered: true,
};

const getCurrentYear = () => new Date().getFullYear();

const TIMELINE_DEFAULTS: TimelineSlice = {
  timelineOpen: false,
  timelineYear: getCurrentYear(),
  timelinePlaying: false,
  timelineSpeed: 1,
};

const HISTORY_DEFAULTS: HistorySlice = {
  threads: {},
  episodes: {},
  events: {},
};

function getHistoryKey(userId: string): string {
  return `whonodeswho:history:v1:${userId}`;
}

function loadHistoryFromStorage(key: string): HistorySlice {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...HISTORY_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<HistorySlice>;
    return {
      threads: parsed.threads ?? {},
      episodes: parsed.episodes ?? {},
      events: parsed.events ?? {},
    };
  } catch {
    return { ...HISTORY_DEFAULTS };
  }
}

function saveHistoryToStorage(
  key: string,
  threads: Record<string, RelationshipThread>,
  episodes: Record<string, RelationshipEpisode>,
  events: Record<string, RelationshipEvent>,
): void {
  try {
    localStorage.setItem(key, JSON.stringify({ threads, episodes, events }));
  } catch (err) {
    console.error("[useGraphStore] history save failed:", err);
  }
}

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
  ...HISTORY_DEFAULTS,
  focusPersonId: null,
  focusDegrees: 1,
  pathPersonIds: [],
  hydrated: false,
  _persistence: null,
  _drafts: null,
  _historyKey: null,
  persistenceError: null,
  recoveryDraft: null,

  // -- lifecycle --
  hydrate: async (userId) => {
    const store = createPersistenceStore();
    const drafts = createDraftStore(userId);
    const historyKey = getHistoryKey(userId);
    const [persisted, draft] = await Promise.all([
      store.load().catch(() => EMPTY_STATE),
      drafts.load().catch(() => null),
    ]);
    const history = loadHistoryFromStorage(historyKey);

    set({
      people: persisted.graph.people,
      relationships: persisted.graph.relationships,
      positions: persisted.positions,
      layoutMode: persisted.layout?.layoutMode ?? LAYOUT_DEFAULTS.layoutMode,
      treeShape: persisted.layout?.treeShape ?? LAYOUT_DEFAULTS.treeShape,
      treeRootId: persisted.layout?.treeRootId ?? LAYOUT_DEFAULTS.treeRootId,
      familyAwareLayered:
        persisted.layout?.familyAwareLayered ?? LAYOUT_DEFAULTS.familyAwareLayered,
      ...history,
      _historyKey: historyKey,
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
      ...HISTORY_DEFAULTS,
      _historyKey: null,
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
    const relationship = buildRelationship(input);
    set((s) => {
      const nextRelationships = [...s.relationships, relationship];
      const reciprocalType = getReciprocalRelationshipType(input.type);

      if (!reciprocalType) {
        return { relationships: nextRelationships };
      }

      const reciprocalInput: RelationshipInput = {
        ...input,
        source: input.target,
        target: input.source,
        type: reciprocalType,
        direction: "one-way",
        autoCreatedReciprocalOfId: relationship.id,
      };

      if (hasRelationship(s.relationships, reciprocalInput)) {
        return { relationships: nextRelationships };
      }

      return {
        relationships: [...nextRelationships, buildRelationship(reciprocalInput)],
      };
    });
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
    set((s) => {
      const idsToDelete = new Set(
        s.relationships
          .filter((relationship) => relationship.id === id || relationship.autoCreatedReciprocalOfId === id)
          .map((relationship) => relationship.id),
      );

      return {
        relationships: s.relationships.filter((relationship) => !idsToDelete.has(relationship.id)),
        selectedRelationshipId:
          s.selectedRelationshipId && idsToDelete.has(s.selectedRelationshipId)
            ? null
            : s.selectedRelationshipId,
      };
    });
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
  setFamilyAwareLayered: (enabled) => {
    set({ familyAwareLayered: enabled });
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
  endRelationship: (id, endYear) => {
    get().updateRelationship(id, {
      endYear: endYear ?? getCurrentYear(),
      isActive: false,
    });
  },

  // -- history actions --
  applyTransition: (threadId, outcome) => {
    const { episodes, events, threads, _historyKey } = get();

    // 1. Find episode
    const episode = episodes[outcome.closedEpisodeId];
    if (!episode) return { ok: false, error: "Episode not found." };

    // 2. Validate episode belongs to the thread
    if (episode.threadId !== threadId) {
      return { ok: false, error: "Episode does not belong to this thread." };
    }

    // 3. Validate thread exists and has valid person references
    const thread = threads[threadId];
    if (!thread) return { ok: false, error: "Thread not found." };
    const people = get().people;
    if (!people.some((p) => p.id === thread.personAId) || !people.some((p) => p.id === thread.personBId)) {
      return { ok: false, error: "One or both people in this thread no longer exist." };
    }

    // 4. Validate transition date >= episode start date
    if (outcome.transitionDate < episode.startDate) {
      return {
        ok: false,
        error: `Transition date cannot be before the episode started (${episode.startDate.slice(0, 4)}).`,
      };
    }

    // 5. Validate new episode kind and check for duplicates
    if (outcome.newEpisode) {
      if (!isValidEpisodeKind(outcome.newEpisode.kind)) {
        return { ok: false, error: `Unknown episode kind: ${outcome.newEpisode.kind}.` };
      }
      const duplicate = Object.values(episodes).find(
        (ep) =>
          ep.threadId === threadId &&
          ep.kind === outcome.newEpisode!.kind &&
          !ep.endDate &&
          ep.id !== outcome.closedEpisodeId,
      );
      if (duplicate) {
        return {
          ok: false,
          error: `This pair already has an active ${outcome.newEpisode.kind.replace(/_/g, " ")} relationship.`,
        };
      }
    }

    // Soft warnings
    let warning: string | undefined;
    const transitionYear = parseInt(outcome.transitionDate.slice(0, 4), 10);
    if (transitionYear > getCurrentYear() + 1) {
      warning = "The transition date is more than one year in the future.";
    } else if (episode.certainty === "unknown") {
      warning = "The closing episode had an uncertain start date.";
    }

    // 6. Build new records
    const newEpisodeRecord: RelationshipEpisode | null = outcome.newEpisode
      ? {
          id: newId(),
          threadId,
          kind: outcome.newEpisode.kind,
          startDate: outcome.transitionDate,
          certainty: outcome.newEpisode.certainty,
          source: "user",
          ...(outcome.newEpisode.notes ? { notes: outcome.newEpisode.notes } : {}),
        }
      : null;

    const eventRecord: RelationshipEvent = {
      id: newId(),
      threadId,
      date: outcome.transitionDate,
      type: outcome.event?.type ?? "milestone",
      title: outcome.event?.title ?? "Relationship changed",
    };

    // 7. Apply mutations
    const updatedEpisodes: Record<string, RelationshipEpisode> = {
      ...episodes,
      [outcome.closedEpisodeId]: { ...episode, endDate: outcome.transitionDate },
      ...(newEpisodeRecord ? { [newEpisodeRecord.id]: newEpisodeRecord } : {}),
    };
    const updatedEvents: Record<string, RelationshipEvent> = {
      ...events,
      [eventRecord.id]: eventRecord,
    };

    set({ episodes: updatedEpisodes, events: updatedEvents });

    // 8. Persist history to localStorage
    if (_historyKey) {
      saveHistoryToStorage(_historyKey, threads, updatedEpisodes, updatedEvents);
    }

    return { ok: true, ...(warning ? { warning } : {}) };
  },

  ensureLegacyRelationshipMigrated: (relationship) => {
    const threadId = makeThreadId(relationship.source, relationship.target);
    const episodeId = `episode:${relationship.id}`;
    const { threads, episodes, events, _historyKey } = get();

    let needsSave = false;
    const updatedThreads = { ...threads };
    const updatedEpisodes = { ...episodes };

    if (!updatedThreads[threadId]) {
      const [personAId, personBId] = normalizeThreadParticipants(
        relationship.source,
        relationship.target,
      );
      updatedThreads[threadId] = {
        id: threadId,
        personAId,
        personBId,
        ...(relationship.color ? { colorOverride: relationship.color } : {}),
        createdAt: relationship.createdAt,
        updatedAt: relationship.updatedAt,
      };
      needsSave = true;
    }

    if (!updatedEpisodes[episodeId]) {
      const episode = migrateLegacyRelationshipToEpisode(relationship, threadId);
      updatedEpisodes[episodeId] = episode;
      needsSave = true;
    }

    if (needsSave) {
      set({ threads: updatedThreads, episodes: updatedEpisodes });
      if (_historyKey) {
        saveHistoryToStorage(_historyKey, updatedThreads, updatedEpisodes, events);
      }
    }

    return { threadId, episodeId };
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
