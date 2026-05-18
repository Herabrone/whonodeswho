import type { CanonicalRelationKind, RelationSubtype } from "./relationKinds";

const RELATION_ALIASES: Record<string, CanonicalRelationKind> = {
  "parent/child": "parent",
  "aunt/uncle/niece/nephew": "aunt/uncle",
  parent: "parent",
  child: "child",
  aunt: "aunt/uncle",
  uncle: "aunt/uncle",
  niece: "niece/nephew",
  nephew: "niece/nephew",
  sibling: "sibling",
  "full-sibling": "full-sibling",
  "full sibling": "full-sibling",
  spouse: "spouse",
  partner: "spouse",
  "ex-spouse": "ex-spouse",
  "ex-partner": "ex-spouse",
  grandparent: "grandparent",
  grandchild: "grandchild",
  "aunt/uncle": "aunt/uncle",
  "niece/nephew": "niece/nephew",
  cousin: "cousin",
  "step-parent": "step-parent",
  "step parent": "step-parent",
  "step-child": "step-child",
  "step child": "step-child",
  "step-sibling": "step-sibling",
  "step sibling": "step-sibling",
  "half-sibling": "half-sibling",
  "half sibling": "half-sibling",
  "parent-in-law": "parent-in-law",
  "parent in law": "parent-in-law",
  "child-in-law": "child-in-law",
  "child in law": "child-in-law",
  "sibling-in-law": "sibling-in-law",
  "sibling in law": "sibling-in-law",
  "grandparent-in-law": "grandparent-in-law",
  "grandparent in law": "grandparent-in-law",
  "grandchild-in-law": "grandchild-in-law",
  "grandchild in law": "grandchild-in-law",
  manager: "manager",
  employee: "employee",
  coworker: "coworker",
  mentor: "mentor",
  mentee: "mentee",
  friend: "friend",
  "close friend": "close friend",
  "best friend": "best friend",
  acquaintance: "acquaintance",
  housemate: "roommate",
  "house mate": "roommate",
  roommate: "roommate",
  report: "employee",
  "direct report": "employee",
};

export function canonicalizeRelationKind(raw: string): CanonicalRelationKind {
  const key = raw.trim().toLowerCase();
  return RELATION_ALIASES[key] ?? key;
}

export function siblingSubtypeFor(kind: string): RelationSubtype | undefined {
  switch (canonicalizeRelationKind(kind)) {
    case "full-sibling":
      return "full";
    case "half-sibling":
      return "half";
    case "step-sibling":
      return "step";
    case "sibling":
      return "unknown";
    default:
      return undefined;
  }
}

export function relationFamilyKey(kind: string): string {
  const canonical = canonicalizeRelationKind(kind);
  switch (canonical) {
    case "full-sibling":
    case "half-sibling":
    case "step-sibling":
      return "sibling";
    case "partner":
      return "spouse";
    default:
      return canonical;
  }
}