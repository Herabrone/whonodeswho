/**
 * whoNodeswho — CORE TYPE CONTRACT
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
  aliases?: string[];
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
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  isActive?: boolean;
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

export type ChatMessageRole = "user" | "assistant" | "tool";

export interface ConversationSummary {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatStreamRequest {
  conversationId?: string;
  message: string;
}

export type PendingActionType = "create_relationship";

export interface PendingCreateRelationshipPayload {
  fromPersonId: string;
  fromPersonName: string;
  toPersonId: string;
  toPersonName: string;
  relationshipType: string;
  category: RelationshipCategory;
  direction: RelationshipDirection;
  notes?: string;
}

export interface PendingAction {
  type: PendingActionType;
  payload: PendingCreateRelationshipPayload;
  createdAt: string;
}

export type ChatSseEvent =
  | { type: "conversation"; conversationId: string }
  | { type: "token"; content: string }
  | { type: "tool_start"; toolName: string }
  | { type: "tool_end"; toolName: string }
  | { type: "pending_action"; pendingAction: PendingAction; token: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ConfirmActionRequest {
  token: string;
}

export interface ConfirmActionResponse {
  success: true;
  action: PendingAction;
  relationship?: Relationship;
  graph?: GraphData;
}
