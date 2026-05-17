import { buildFactBase } from "./buildFactBase";
import type { Fact } from "./facts";
import { factKey, sortFacts, uniqueFacts } from "./facts";
import { applyFamilyRules } from "./familyRules";
import { proposalsFromFacts } from "./proposalRules";
import type { InferenceRequest, InferenceResult } from "./proposalTypes";
import { validateFactBase } from "./validationRules";
import { applyWorkRules } from "./workRules";

function freshFacts(known: Fact[], derived: Fact[]): Fact[] {
  const knownKeys = new Set(known.map(factKey));
  return uniqueFacts(derived).filter((fact) => !knownKeys.has(factKey(fact)));
}

function applyPositiveRules(known: Fact[], frontier: Fact[], depth: number): Fact[] {
  return sortFacts([
    ...applyFamilyRules(known, frontier, depth),
    ...applyWorkRules(known, frontier, depth),
  ]);
}

export function runRelationshipInference({
  existingRelationships,
  primary,
  maxIterations = 2,
  people,
}: InferenceRequest): InferenceResult {
  // 1. Identify neighbors of A and B in existing relationships
  const neighbors = new Set<string>();
  for (const rel of existingRelationships) {
    neighbors.add(rel.source);
    neighbors.add(rel.target);
  }

  // 2. Define the eligible pool: all people seen in existing relationships + A and B
  const pool = new Set([...neighbors, primary.source, primary.target]);

  const factBase = buildFactBase(existingRelationships, primary);
  const validationIssues = validateFactBase(factBase);
  const hasFatalIssue = validationIssues.some((issue) => issue.severity === "fatal");
  if (hasFatalIssue) {
    return { facts: factBase.facts, proposals: [], issues: validationIssues };
  }

  let known = factBase.facts;
  let frontier = factBase.facts;
  for (let depth = 1; depth <= maxIterations; depth++) {
    const derived = applyPositiveRules(known, frontier, depth);

    // 3. Filter derived facts: only keep facts where BOTH people are in the pool
    // This allows the engine to USE all existing knowledge, but only PROPOSE 
    // or CHAIN new facts that directly involve the eligible participants.
    const filteredDerived = derived.filter(
      (fact) => pool.has(fact.args[0]) && pool.has(fact.args[1]),
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