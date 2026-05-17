/**
 * localStorage implementation of RelationshipStore.
 * Versioned key so future migrations are possible.
 */
import type { PersistedState } from "../types";
import { EMPTY_STATE, type RelationshipStore } from "./persistence";

const STORAGE_KEY = "relationflow:v1";

export class LocalStorageStore implements RelationshipStore {
  async load(): Promise<PersistedState> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(EMPTY_STATE);
      const parsed = JSON.parse(raw) as PersistedState;
      // Minimal shape guard — never trust persisted data blindly.
      if (!parsed.graph || !Array.isArray(parsed.graph.people)) {
        return structuredClone(EMPTY_STATE);
      }
      return {
        graph: {
          people: parsed.graph.people ?? [],
          relationships: parsed.graph.relationships ?? [],
        },
        positions: parsed.positions ?? {},
        layout: {
          layoutMode: parsed.layout?.layoutMode ?? EMPTY_STATE.layout.layoutMode,
          treeShape: parsed.layout?.treeShape ?? EMPTY_STATE.layout.treeShape,
          treeRootId: parsed.layout?.treeRootId ?? EMPTY_STATE.layout.treeRootId,
        },
      };
    } catch (err) {
      console.error("[LocalStorageStore] load failed:", err);
      return structuredClone(EMPTY_STATE);
    }
  }

  async save(state: PersistedState): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error("[LocalStorageStore] save failed:", err);
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Singleton used by the app. Swap this line to change backends. */
export const persistenceStore: RelationshipStore = new LocalStorageStore();
