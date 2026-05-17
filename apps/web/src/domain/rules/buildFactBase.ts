import type { Relationship, RelationshipInput } from "../../types";
import { normalizeRelationship } from "../relations/normalizeRelationship";
import type { Fact, FactSource } from "./facts";
import { uniqueFacts } from "./facts";

export type RelationshipLike = Pick<
  Relationship,
  "source" | "target" | "type" | "category" | "direction"
> & { id?: string };

export interface FactBase {
  facts: Fact[];
  existingFacts: Fact[];
  primaryFacts: Fact[];
  primary: RelationshipInput;
  existingRelationships: RelationshipLike[];
}

export function relationshipToFact(
  relationship: Pick<RelationshipLike, "source" | "target" | "type" | "id">,
  source: FactSource,
): Fact | null {
  const normalized = normalizeRelationship(relationship);
  if (!normalized) return null;

  return {
    predicate: normalized.predicate,
    args: normalized.args,
    subtype: normalized.subtype,
    source,
    derivationDepth: 0,
    relationshipId: relationship.id,
  };
}

export function buildFactBase(
  existingRelationships: RelationshipLike[],
  primary: RelationshipInput,
): FactBase {
  const existingFacts = uniqueFacts(
    existingRelationships
      .map((relationship) => relationshipToFact(relationship, "existing"))
      .filter((fact): fact is Fact => Boolean(fact)),
  );
  const primaryFacts = uniqueFacts(
    [relationshipToFact(primary, "primary")].filter((fact): fact is Fact => Boolean(fact)),
  );

  return {
    facts: uniqueFacts([...existingFacts, ...primaryFacts]),
    existingFacts,
    primaryFacts,
    primary,
    existingRelationships,
  };
}