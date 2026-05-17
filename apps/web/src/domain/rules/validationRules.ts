import type { RelationshipInput } from "../../types";
import { relationshipMatches } from "../relations/relationMatcher";
import type { Fact, FactReference } from "./facts";
import { factKey, factRef } from "./facts";
import type { FactBase, RelationshipLike } from "./buildFactBase";
import { relationshipToFact } from "./buildFactBase";
import type { ValidationIssue } from "./proposalTypes";

function parentFacts(facts: Fact[]): Fact[] {
  return facts.filter((fact) => fact.predicate === "parent");
}

export function parentsOf(facts: Fact[], childId: string): Fact[] {
  return parentFacts(facts).filter((fact) => fact.args[1] === childId);
}

export function parentIdsOf(facts: Fact[], childId: string): Set<string> {
  return new Set(parentsOf(facts, childId).map((fact) => fact.args[0]));
}

export function wouldExceedParentCardinality(facts: Fact[], parentId: string, childId: string): boolean {
  const parentIds = parentIdsOf(facts, childId);
  return !parentIds.has(parentId) && parentIds.size >= 2;
}

function createsParentCycle(existingFacts: Fact[], parentId: string, childId: string): boolean {
  const childrenByParent = new Map<string, string[]>();
  for (const fact of parentFacts(existingFacts)) {
    const children = childrenByParent.get(fact.args[0]) ?? [];
    children.push(fact.args[1]);
    childrenByParent.set(fact.args[0], children);
  }

  const queue = [childId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === parentId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    queue.push(...(childrenByParent.get(current) ?? []));
  }
  return false;
}

function duplicatePrimaryIssue(base: FactBase): ValidationIssue | null {
  const primaryFactKeys = new Set(base.primaryFacts.map(factKey));
  if (base.existingFacts.some((fact) => primaryFactKeys.has(factKey(fact)))) {
    return {
      severity: "fatal",
      code: "duplicate-relationship",
      message: "That relationship is already recorded.",
    };
  }

  if (
    base.existingRelationships.some((relationship) =>
      relationshipMatches(relationship, base.primary),
    )
  ) {
    return {
      severity: "fatal",
      code: "duplicate-relationship",
      message: "That relationship is already recorded.",
    };
  }

  return null;
}

export function validateFactBase(base: FactBase): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (base.primary.source === base.primary.target) {
    issues.push({
      severity: "fatal",
      code: "self-link",
      message: "Source and target must be different.",
    });
  }

  for (const fact of base.primaryFacts) {
    if (fact.args[0] === fact.args[1]) {
      issues.push({
        severity: "fatal",
        code: "self-link",
        message: "A relationship cannot point to the same person.",
        fact: factRef(fact),
      });
    }

    if (fact.predicate === "parent") {
      const [parentId, childId] = fact.args;
      if (wouldExceedParentCardinality(base.existingFacts, parentId, childId)) {
        issues.push({
          severity: "fatal",
          code: "parent-cardinality",
          message: "This person already has two recorded parents.",
          fact: factRef(fact),
        });
      }
      if (createsParentCycle(base.existingFacts, parentId, childId)) {
        issues.push({
          severity: "fatal",
          code: "parent-cycle",
          message: "That parent relationship would create a parent/child cycle.",
          fact: factRef(fact),
        });
      }
    }
  }

  const duplicate = duplicatePrimaryIssue(base);
  if (duplicate) issues.push(duplicate);

  return issues;
}

export function withheldParentIssue(fact: Fact, baseFacts: Fact[]): ValidationIssue {
  const parents = [...parentIdsOf(baseFacts, fact.args[1])].join(" and ");
  return {
    severity: "warning",
    code: "withheld-proposal",
    message: parents
      ? `A parent suggestion for ${fact.args[1]} was withheld because ${fact.args[1]} already has two recorded parents: ${parents}.`
      : `A parent suggestion for ${fact.args[1]} was withheld because it would exceed the two-parent limit.`,
    fact: factRef(fact),
  };
}

export function validateRelationshipDrafts(
  existingRelationships: RelationshipLike[],
  drafts: RelationshipInput[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const knownRelationships = [...existingRelationships];
  const knownFacts: Fact[] = existingRelationships
    .map((relationship) => relationshipToFact(relationship, "existing"))
    .filter((fact): fact is Fact => Boolean(fact));

  for (const draft of drafts) {
    const fact = relationshipToFact(draft, "primary");
    if (draft.source === draft.target) {
      issues.push({ severity: "fatal", code: "self-link", message: "Source and target must be different." });
      continue;
    }
    if (knownRelationships.some((relationship) => relationshipMatches(relationship, draft))) {
      issues.push({ severity: "fatal", code: "duplicate-relationship", message: "One selected relationship is already recorded." });
      continue;
    }
    if (fact?.predicate === "parent") {
      const [parentId, childId] = fact.args;
      if (wouldExceedParentCardinality(knownFacts, parentId, childId)) {
        issues.push({
          severity: "fatal",
          code: "parent-cardinality",
          message: "One selected parent suggestion would exceed the two-parent limit.",
          fact: factRef(fact),
        });
        continue;
      }
      if (createsParentCycle(knownFacts, parentId, childId)) {
        issues.push({
          severity: "fatal",
          code: "parent-cycle",
          message: "One selected parent suggestion would create a parent/child cycle.",
          fact: factRef(fact),
        });
        continue;
      }
    }

    knownRelationships.push(draft);
    if (fact) knownFacts.push(fact);
  }

  return issues;
}

export function maxEvidenceDepth(evidence: FactReference[] | undefined): number {
  return evidence?.reduce((max, item) => Math.max(max, item.derivationDepth), 0) ?? 0;
}