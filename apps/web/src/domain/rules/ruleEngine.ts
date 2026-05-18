import { buildFactBase } from "./buildFactBase";
import type { RelationshipLike } from "./buildFactBase";
import type { Fact } from "./facts";
import { factKey, sortFacts, uniqueFacts } from "./facts";
import { applyFamilyRules } from "./familyRules";
import { proposalsFromFacts } from "./proposalRules";
import type { InferenceRequest, InferenceResult } from "./proposalTypes";
import { applySocialRules } from "./socialRules";
import { validateFactBase } from "./validationRules";
import { applyWorkRules } from "./workRules";

function freshFacts(known: Fact[], derived: Fact[]): Fact[] {
  const knownKeys = new Set(known.map(factKey));
  return uniqueFacts(derived).filter((fact) => !knownKeys.has(factKey(fact)));
}

function applyPositiveRules(
  known: Fact[],
  frontier: Fact[],
  depth: number,
  existingRelationships: RelationshipLike[],
  primary: InferenceRequest["primary"],
): Fact[] {
  return sortFacts([
    ...applyFamilyRules(known, frontier, depth),
    ...applyWorkRules(known, frontier, depth),
    ...applySocialRules(known, frontier, depth, existingRelationships, primary),
  ]);
}

function filterRelationshipsForInference(existingRelationships: RelationshipLike[]): RelationshipLike[] {
  return existingRelationships.filter((relationship) => !relationship.autoCreatedReciprocalOfId);
}

function collectEligibleParticipantIds(
  existingRelationships: RelationshipLike[],
  primary: InferenceRequest["primary"],
): Set<string> {
  const eligibleParticipantIds = new Set([primary.source, primary.target]);

  for (const relationship of existingRelationships) {
    const touchesPrimary = relationship.source === primary.source ||
      relationship.target === primary.source ||
      relationship.source === primary.target ||
      relationship.target === primary.target;

    if (!touchesPrimary) continue;

    eligibleParticipantIds.add(relationship.source);
    eligibleParticipantIds.add(relationship.target);
  }

  return eligibleParticipantIds;
}

function scopeRelationshipsToEligibleParticipants(
  existingRelationships: RelationshipLike[],
  eligibleParticipantIds: Set<string>,
): RelationshipLike[] {
  return existingRelationships.filter(
    (relationship) =>
      eligibleParticipantIds.has(relationship.source) && eligibleParticipantIds.has(relationship.target),
  );
}

export function runRelationshipInference({
  existingRelationships,
  primary,
  maxIterations = 2,
  people,
}: InferenceRequest): InferenceResult {
  const inferenceRelationships = filterRelationshipsForInference(existingRelationships);
  const eligibleParticipantIds = collectEligibleParticipantIds(inferenceRelationships, primary);
  const scopedRelationships = scopeRelationshipsToEligibleParticipants(
    inferenceRelationships,
    eligibleParticipantIds,
  );

  const factBase = buildFactBase(scopedRelationships, primary);
  const validationIssues = validateFactBase(factBase);
  const hasFatalIssue = validationIssues.some((issue) => issue.severity === "fatal");
  if (hasFatalIssue) {
    return { facts: factBase.facts, proposals: [], issues: validationIssues };
  }

  let known = factBase.facts;
  let frontier = factBase.facts;
  for (let depth = 1; depth <= maxIterations; depth++) {
    const derived = applyPositiveRules(known, frontier, depth, scopedRelationships, primary);

    // Defensive guard: once the one-hop pool is fixed, no rule should be able to
    // introduce participants outside that pool.
    const filteredDerived = derived.filter(
      (fact) =>
        eligibleParticipantIds.has(fact.args[0]) && eligibleParticipantIds.has(fact.args[1]),
    );

    const fresh = freshFacts(known, filteredDerived);
    if (fresh.length === 0) break;
    known = sortFacts([...known, ...fresh]);
    frontier = fresh;
  }

  const { proposals, issues } = proposalsFromFacts(known, factBase.facts, people);
  return {
    facts: known,
    proposals,
    issues: [...validationIssues, ...issues],
  };
}