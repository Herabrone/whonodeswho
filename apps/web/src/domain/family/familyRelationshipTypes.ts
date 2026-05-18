import type { Relationship } from "../../types";

export type FamilyRelationKind =
  | "parent"
  | "child"
  | "sibling"
  | "spouse"
  | "partner"
  | "grandparent"
  | "grandchild"
  | "uncle_aunt"
  | "niece_nephew"
  | "cousin"
  | "in_law"
  | "unknown_family";

const PARENT_TYPES = new Set(["parent", "mother", "father", "step-parent", "step parent"]);
const CHILD_TYPES = new Set(["child", "son", "daughter", "step-child", "step child"]);
const SIBLING_TYPES = new Set([
  "sibling",
  "brother",
  "sister",
  "full-sibling",
  "full sibling",
  "half-sibling",
  "half sibling",
  "step-sibling",
  "step sibling",
]);
const SPOUSE_TYPES = new Set(["spouse", "husband", "wife"]);
const PARTNER_TYPES = new Set(["partner"]);
const GRANDPARENT_TYPES = new Set(["grandparent", "grandfather", "grandmother"]);
const GRANDCHILD_TYPES = new Set(["grandchild", "grandson", "granddaughter"]);
const UNCLE_AUNT_TYPES = new Set(["aunt/uncle", "aunt", "uncle"]);
const NIECE_NEPHEW_TYPES = new Set(["niece/nephew", "niece", "nephew"]);
const COUSIN_TYPES = new Set(["cousin"]);
const IN_LAW_TYPES = new Set([
  "parent-in-law",
  "parent in law",
  "child-in-law",
  "child in law",
  "sibling-in-law",
  "sibling in law",
  "grandparent-in-law",
  "grandparent in law",
  "grandchild-in-law",
  "grandchild in law",
]);

function normalizeType(type: string): string {
  return type.trim().toLowerCase();
}

function otherPersonId(relationship: Relationship, fromPersonId: string): string | null {
  if (relationship.source === fromPersonId) return relationship.target;
  if (relationship.target === fromPersonId) return relationship.source;
  return null;
}

export function isFamilyRelationship(relationship: Relationship): boolean {
  if (relationship.category === "family") return true;

  const type = normalizeType(relationship.type);
  return SPOUSE_TYPES.has(type) || PARTNER_TYPES.has(type);
}

export function getFamilyRelationKind(
  relationship: Relationship,
  fromPersonId: string,
): FamilyRelationKind | null {
  if (!otherPersonId(relationship, fromPersonId)) return null;

  const type = normalizeType(relationship.type);

  if (PARENT_TYPES.has(type)) {
    return relationship.target === fromPersonId ? "parent" : "child";
  }

  if (CHILD_TYPES.has(type)) {
    return relationship.source === fromPersonId ? "parent" : "child";
  }

  if (SIBLING_TYPES.has(type)) return "sibling";
  if (SPOUSE_TYPES.has(type)) return "spouse";
  if (PARTNER_TYPES.has(type)) return "partner";

  if (GRANDPARENT_TYPES.has(type)) {
    return relationship.target === fromPersonId ? "grandparent" : "grandchild";
  }

  if (GRANDCHILD_TYPES.has(type)) {
    return relationship.source === fromPersonId ? "grandparent" : "grandchild";
  }

  if (UNCLE_AUNT_TYPES.has(type)) {
    return relationship.target === fromPersonId ? "uncle_aunt" : "niece_nephew";
  }

  if (NIECE_NEPHEW_TYPES.has(type)) {
    return relationship.source === fromPersonId ? "uncle_aunt" : "niece_nephew";
  }

  if (COUSIN_TYPES.has(type)) return "cousin";
  if (IN_LAW_TYPES.has(type)) return "in_law";

  return relationship.category === "family" ? "unknown_family" : null;
}