/**
 * whoNodeswho — SHARED CONSTANTS
 * Single source of truth for category colors and the relationship catalog.
 */
import {
  getCategoryGfxColor,
  getCategoryUiColor,
  primitives,
} from "./design-tokens";
import type { RelationshipCategory } from "./types";

export const CATEGORY_GFX_COLORS: Record<RelationshipCategory, string> = {
  family: getCategoryGfxColor("family"),
  friend: getCategoryGfxColor("friend"),
  romantic: getCategoryGfxColor("romantic"),
  work: getCategoryGfxColor("work"),
  education: getCategoryGfxColor("education"),
  other: getCategoryGfxColor("other"),
};

export const CATEGORY_UI_COLORS: Record<RelationshipCategory, string> = {
  family: getCategoryUiColor("family"),
  friend: getCategoryUiColor("friend"),
  romantic: getCategoryUiColor("romantic"),
  work: getCategoryUiColor("work"),
  education: getCategoryUiColor("education"),
  other: getCategoryUiColor("other"),
};

export const CATEGORY_COLORS: Record<RelationshipCategory, string> = {
  ...CATEGORY_GFX_COLORS,
};

export const CATEGORIES: RelationshipCategory[] = [
  "family",
  "friend",
  "romantic",
  "work",
  "education",
  "other",
];

export const CATEGORY_LABELS: Record<RelationshipCategory, string> = {
  family: "Family",
  friend: "Friend",
  romantic: "Romantic",
  work: "Work",
  education: "Education",
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
    // Step and half family
    "step-parent",
    "step-child",
    "step-sibling",
    "half-sibling",
    // In-laws (directional — source role listed first)
    "parent-in-law",
    "child-in-law",
    "sibling-in-law",
    "grandparent-in-law",
    "grandchild-in-law",
  ],
  friend: ["friend", "close friend", "best friend", "acquaintance"],
  romantic: ["partner", "spouse", "ex-partner", "ex-spouse"],
  work: ["coworker", "manager", "employee", "business partner", "client"],
  education: ["classmate"],
  other: ["mentor", "mentee", "roommate", "neighbour", "custom"],
};

/** Relationship types considered "weak" — Track C can hide these. */
export const WEAK_RELATIONSHIP_TYPES = new Set<string>([
  "acquaintance",
  "neighbour",
]);

/** Default fallback color for a Person node when Person.color is absent. */
export const DEFAULT_PERSON_COLOR = primitives.neutral[900];

/** Resolve the display color of a relationship. */
export function relationshipColor(category: RelationshipCategory, override?: string): string {
  return override ?? CATEGORY_COLORS[category];
}
