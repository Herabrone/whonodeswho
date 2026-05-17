import { canonicalizeRelationKind, relationFamilyKey } from "./relationAliases";
import { INVERSE_RELATION_KIND, SYMMETRIC_RELATION_KINDS } from "./relationKinds";

export function isSymmetricRelationKind(kind: string): boolean {
  return SYMMETRIC_RELATION_KINDS.has(relationFamilyKey(kind));
}

export function inverseRelationKind(kind: string): string {
  const canonical = canonicalizeRelationKind(kind);
  return INVERSE_RELATION_KIND[canonical] ?? canonical;
}

export function createRelationshipKey(source: string, target: string, type: string): string {
  const kind = relationFamilyKey(type);
  if (isSymmetricRelationKind(kind)) {
    const [a, b] = [source, target].sort();
    return `${a}::${b}::${kind}`;
  }
  return `${source}::${target}::${kind}`;
}

export function relationshipMatches(
  left: { source: string; target: string; type: string },
  right: { source: string; target: string; type: string },
): boolean {
  if (createRelationshipKey(left.source, left.target, left.type) === createRelationshipKey(right.source, right.target, right.type)) {
    return true;
  }

  const inverse = inverseRelationKind(right.type);
  return createRelationshipKey(left.source, left.target, left.type) === createRelationshipKey(right.target, right.source, inverse);
}