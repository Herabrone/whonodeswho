import type { RelationshipCategory, RelationshipDirection } from "../../types";

export type CanonicalRelationKind =
  | "parent"
  | "child"
  | "sibling"
  | "full-sibling"
  | "half-sibling"
  | "step-sibling"
  | "spouse"
  | "ex-spouse"
  | "grandparent"
  | "grandchild"
  | "aunt/uncle"
  | "niece/nephew"
  | "cousin"
  | "step-parent"
  | "step-child"
  | "parent-in-law"
  | "child-in-law"
  | "sibling-in-law"
  | "grandparent-in-law"
  | "grandchild-in-law"
  | "manager"
  | "employee"
  | "coworker"
  | "mentor"
  | "mentee"
  | "friend"
  | "close friend"
  | "best friend"
  | "acquaintance"
  | "roommate"
  | string;

export type RelationSubtype = "full" | "half" | "step" | "unknown";

export type FactPredicate =
  | "parent"
  | "sibling"
  | "spouse"
  | "grandparent"
  | "auntUncle"
  | "cousin"
  | "manages"
  | "coworker"
  | "parentInLaw"
  | "siblingInLaw";

export const SYMMETRIC_RELATION_KINDS = new Set<string>([
  "sibling",
  "full-sibling",
  "half-sibling",
  "step-sibling",
  "spouse",
  "cousin",
  "sibling-in-law",
  "coworker",
  "friend",
  "close friend",
  "best friend",
  "acquaintance",
  "roommate",
  "rival",
  "enemy",
]);

export const INVERSE_RELATION_KIND: Record<string, string> = {
  parent: "child",
  child: "parent",
  grandparent: "grandchild",
  grandchild: "grandparent",
  "aunt/uncle": "niece/nephew",
  "niece/nephew": "aunt/uncle",
  "step-parent": "step-child",
  "step-child": "step-parent",
  "parent-in-law": "child-in-law",
  "child-in-law": "parent-in-law",
  "grandparent-in-law": "grandchild-in-law",
  "grandchild-in-law": "grandparent-in-law",
  manager: "employee",
  employee: "manager",
  mentor: "mentee",
  mentee: "mentor",
};

export const TYPE_DEFAULTS: Record<
  string,
  { category: RelationshipCategory; direction: RelationshipDirection }
> = {
  parent: { category: "family", direction: "one-way" },
  child: { category: "family", direction: "one-way" },
  sibling: { category: "family", direction: "two-way" },
  "full-sibling": { category: "family", direction: "two-way" },
  "half-sibling": { category: "family", direction: "two-way" },
  "step-sibling": { category: "family", direction: "two-way" },
  spouse: { category: "romantic", direction: "two-way" },
  partner: { category: "romantic", direction: "two-way" },
  grandparent: { category: "family", direction: "one-way" },
  grandchild: { category: "family", direction: "one-way" },
  "aunt/uncle": { category: "family", direction: "one-way" },
  "niece/nephew": { category: "family", direction: "one-way" },
  cousin: { category: "family", direction: "two-way" },
  "step-parent": { category: "family", direction: "one-way" },
  "step-child": { category: "family", direction: "one-way" },
  "parent-in-law": { category: "family", direction: "one-way" },
  "child-in-law": { category: "family", direction: "one-way" },
  "sibling-in-law": { category: "family", direction: "two-way" },
  "grandparent-in-law": { category: "family", direction: "one-way" },
  "grandchild-in-law": { category: "family", direction: "one-way" },
  manager: { category: "work", direction: "one-way" },
  employee: { category: "work", direction: "one-way" },
  coworker: { category: "work", direction: "two-way" },
  mentor: { category: "other", direction: "one-way" },
  mentee: { category: "other", direction: "one-way" },
  friend: { category: "friend", direction: "two-way" },
  "close friend": { category: "friend", direction: "two-way" },
  "best friend": { category: "friend", direction: "two-way" },
  acquaintance: { category: "friend", direction: "two-way" },
  classmate: { category: "education", direction: "two-way" },
  roommate: { category: "other", direction: "two-way" },
  rival: { category: "conflict", direction: "two-way" },
  enemy: { category: "conflict", direction: "two-way" },
  estranged: { category: "conflict", direction: "one-way" },
  "no contact": { category: "conflict", direction: "one-way" },
  frenemy: { category: "conflict", direction: "one-way" },
  betrayed: { category: "conflict", direction: "one-way" },
  traitor: { category: "conflict", direction: "one-way" },
  "on bad terms": { category: "conflict", direction: "one-way" },
  complicated: { category: "conflict", direction: "one-way" },
};

export function getTypeDefaults(
  type: string,
): { category: RelationshipCategory; direction: RelationshipDirection } {
  return TYPE_DEFAULTS[type] ?? { category: "other", direction: "two-way" };
}