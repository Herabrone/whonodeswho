import type { Relationship, RelationshipInput } from "../../types";
import { canonicalizeRelationKind, siblingSubtypeFor } from "./relationAliases";
import type { FactPredicate, RelationSubtype } from "./relationKinds";

export interface NormalizedRelationshipFact {
  predicate: FactPredicate;
  args: [string, string];
  subtype?: RelationSubtype;
  canonicalKind: string;
}

function sortedPair(a: string, b: string): [string, string] {
  return [a, b].sort() as [string, string];
}

export function normalizeRelationship(
  relationship: Pick<Relationship | RelationshipInput, "source" | "target" | "type">,
): NormalizedRelationshipFact | null {
  const kind = canonicalizeRelationKind(relationship.type);
  const { source, target } = relationship;

  const siblingSubtype = siblingSubtypeFor(kind);
  if (siblingSubtype) {
    return {
      predicate: "sibling",
      args: sortedPair(source, target),
      subtype: siblingSubtype,
      canonicalKind: "sibling",
    };
  }

  switch (kind) {
    case "parent":
      return { predicate: "parent", args: [source, target], canonicalKind: kind };
    case "child":
      return { predicate: "parent", args: [target, source], canonicalKind: kind };
    case "spouse":
      return { predicate: "spouse", args: sortedPair(source, target), canonicalKind: kind };
    case "grandparent":
      return { predicate: "grandparent", args: [source, target], canonicalKind: kind };
    case "grandchild":
      return { predicate: "grandparent", args: [target, source], canonicalKind: kind };
    case "aunt/uncle":
      return { predicate: "auntUncle", args: [source, target], canonicalKind: kind };
    case "niece/nephew":
      return { predicate: "auntUncle", args: [target, source], canonicalKind: kind };
    case "cousin":
      return { predicate: "cousin", args: sortedPair(source, target), canonicalKind: kind };
    case "manager":
      return { predicate: "manages", args: [source, target], canonicalKind: kind };
    case "employee":
      return { predicate: "manages", args: [target, source], canonicalKind: kind };
    case "coworker":
      return { predicate: "coworker", args: sortedPair(source, target), canonicalKind: kind };
    case "parent-in-law":
      return { predicate: "parentInLaw", args: [source, target], canonicalKind: kind };
    case "child-in-law":
      return { predicate: "parentInLaw", args: [target, source], canonicalKind: kind };
    case "sibling-in-law":
      return { predicate: "siblingInLaw", args: sortedPair(source, target), canonicalKind: kind };
    default:
      return null;
  }
}