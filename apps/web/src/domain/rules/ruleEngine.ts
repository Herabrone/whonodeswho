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
}: InferenceRequest): InferenceResult {
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
    const fresh = freshFacts(known, derived);
    if (fresh.length === 0) break;
    known = sortFacts([...known, ...fresh]);
    frontier = fresh;
  }

  const { proposals, issues } = proposalsFromFacts(known, factBase.facts);
  return {
    facts: known,
    proposals,
    issues: [...validationIssues, ...issues],
  };
}