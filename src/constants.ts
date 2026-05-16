/**
 * RelationFlow — SHARED CONSTANTS
 * Single source of truth for category colors and the relationship catalog.
 * Mirror of the color values in tailwind.config.js — keep them in sync.
 */
import type { RelationshipCategory } from "./types";

export const CATEGORY_COLORS: Record<RelationshipCategory, string> = {
  family: "#3b5bdb",
  friend: "#2f9e44",
  romantic: "#e64980",
  work: "#f08c00",
  other: "#868e96",
};

export const CATEGORIES: RelationshipCategory[] = [
  "family",
  "friend",
  "romantic",
  "work",
  "other",
];

export const CATEGORY_LABELS: Record<RelationshipCategory, string> = {
  family: "Family",
  friend: "Friend",
  romantic: "Romantic",
  work: "Work",
  other: "Other",
};

/** Suggested relationship types per category. UI may also allow free text. */
export const RELATIONSHIP_CATALOG: Record<RelationshipCategory, string[]> = {
  family: [
    "parent",
    "child",
    "sibling",
    "spouse",
    "grandparent",
    "grandchild",
    "aunt/uncle",
    "niece/nephew",
    "cousin",
  ],
  friend: ["friend", "close friend", "best friend", "acquaintance"],
  romantic: ["partner", "spouse", "ex-partner", "ex-spouse"],
  work: ["coworker", "manager", "employee", "business partner", "client"],
  other: ["mentor", "mentee", "roommate", "classmate", "neighbour", "custom"],
};

/** Relationship types considered "weak" — Track C can hide these. */
export const WEAK_RELATIONSHIP_TYPES = new Set<string>([
  "acquaintance",
  "neighbour",
]);

/** Default fallback color for a Person node when Person.color is absent. */
export const DEFAULT_PERSON_COLOR = "#1a1d24";

/** Resolve the display color of a relationship. */
export function relationshipColor(category: RelationshipCategory, override?: string): string {
  return override ?? CATEGORY_COLORS[category];
}
