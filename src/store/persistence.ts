/**
 * RelationFlow — PERSISTENCE CONTRACT
 * -----------------------------------
 * The store talks to persistence ONLY through this async interface. Today the
 * implementation is localStorage; swapping to Supabase/Postgres later means
 * writing a new class that implements RelationshipStore — no other file changes.
 *
 * The interface is intentionally async so the swap is a drop-in.
 */
import type { PersistedState } from "../types";

export interface RelationshipStore {
  /** Load persisted state. Returns an empty state if nothing is stored. */
  load(): Promise<PersistedState>;
  /** Persist the full state. Implementations may debounce internally. */
  save(state: PersistedState): Promise<void>;
  /** Remove all persisted data. */
  clear(): Promise<void>;
}

export const EMPTY_STATE: PersistedState = {
  graph: { people: [], relationships: [] },
  positions: {},
};
