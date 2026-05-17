/**
 * RelationFlow — CORE TYPE CONTRACT
 * ---------------------------------
 * Shared by the frontend and backend. Keep UI concerns out of this package.
 */

export type RelationshipCategory =
  | "family"
  | "friend"
  | "romantic"
  | "work"
  | "other";

export type RelationshipDirection = "one-way" | "two-way";

export interface Person {
  id: string;
  name: string;
  notes?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  category: RelationshipCategory;
  direction: RelationshipDirection;
  color?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GraphData {
  people: Person[];
  relationships: Relationship[];
}

export interface XYPosition {
  x: number;
  y: number;
}

export interface PersistedState {
  graph: GraphData;
  positions: Record<string, XYPosition>;
  layout: {
    layoutMode: LayoutMode;
    treeShape: TreeShape;
    treeRootId: string | null;
  };
}

export type FocusDegrees = 1 | 2 | 3 | "all";
export type LayoutMode = "free" | "tree";
export type TreeShape = "radial" | "layered" | "grouped";

export type PersonInput = Omit<Person, "id" | "createdAt" | "updatedAt">;
export type RelationshipInput = Omit<
  Relationship,
  "id" | "createdAt" | "updatedAt"
>;

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSessionResponse {
  user: AuthUser | null;
}
