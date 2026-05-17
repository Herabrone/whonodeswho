/**
 * RelationFlow — CORE TYPE CONTRACT
 * ---------------------------------
 * This file is the frozen integration contract for all parallel tracks.
 * Track A / B / C all import from here. DO NOT change a type's shape once
 * Phase 0 is merged — only additive, optional fields are allowed afterwards,
 * and only by agreement (see docs/00-architecture.md).
 */

export type RelationshipCategory =
  | "family"
  | "friend"
  | "romantic"
  | "work"
  | "other";

export type RelationshipDirection = "one-way" | "two-way";

/** A node in the graph. */
export interface Person {
  id: string;
  name: string;
  notes?: string;
  /** Optional explicit node color override. When absent, UI derives a default. */
  color?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** An edge in the graph. `source` and `target` are Person.id values. */
export interface Relationship {
  id: string;
  source: string;
  target: string;
  /** Free text or a value from RELATIONSHIP_CATALOG, e.g. "sibling", "manager". */
  type: string;
  category: RelationshipCategory;
  direction: RelationshipDirection;
  /** Optional explicit edge color override. When absent, derived from category. */
  color?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** The canonical domain graph. This is what JSON import/export round-trips. */
export interface GraphData {
  people: Person[];
  relationships: Relationship[];
}

/** A node's canvas position. */
export interface XYPosition {
  x: number;
  y: number;
}

/**
 * Everything that gets persisted. The persistence layer round-trips this.
 * `positions` is keyed by Person.id; missing entries get auto-laid-out.
 */
export interface PersistedState {
  graph: GraphData;
  positions: Record<string, XYPosition>;
  layout: {
    layoutMode: LayoutMode;
    treeShape: TreeShape;
    treeRootId: string | null;
  };
}

/** Focus-mode depth. Owned (written) by Track B; read by Phase 0's graph view. */
export type FocusDegrees = 1 | 2 | 3 | "all";
export type LayoutMode = "free" | "tree";
export type TreeShape = "radial" | "layered" | "grouped";

/**
 * Payloads for create operations. Store actions generate id/createdAt/updatedAt.
 */
export type PersonInput = Omit<Person, "id" | "createdAt" | "updatedAt">;
export type RelationshipInput = Omit<
  Relationship,
  "id" | "createdAt" | "updatedAt"
>;
