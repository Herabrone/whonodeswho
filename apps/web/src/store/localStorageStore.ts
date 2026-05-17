/**
 * localStorage implementation of RelationshipStore.
 * Versioned key so future migrations are possible.
 */
import type { PersistedState } from "../types";
import { EMPTY_STATE, type RelationshipStore } from "./persistence";

export class LocalStorageStore implements RelationshipStore {
  constructor(private userId: string) {}

  private get key() {
    return `relationflow:v1:${this.userId}`;
  }

  async load(): Promise<PersistedState> {
    try {
      const raw = localStorage.getItem(this.key);
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
          treeRootId:
            parsed.layout?.treeRootId ?? EMPTY_STATE.layout.treeRootId,
        },
      };
    } catch (err) {
      console.error("[LocalStorageStore] load failed:", err);
      return structuredClone(EMPTY_STATE);
    }
  }

  async save(state: PersistedState): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch (err) {
      console.error("[LocalStorageStore] save failed:", err);
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.key);
  }
}

/** Factory to create a persistence store for a specific user. */
export function createPersistenceStore(userId: string): RelationshipStore {
  return new LocalStorageStore(userId);
}
