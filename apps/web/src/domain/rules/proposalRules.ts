import type { RelationshipCategory, RelationshipDirection, RelationshipInput } from "../../types";
import { getTypeDefaults } from "../relations/relationKinds";
import type { Fact } from "./facts";
import { factKey } from "./facts";
import { confidenceForFact, confidenceRank, shouldPrecheck } from "./confidence";
import type { RelationshipProposal, ValidationIssue } from "./proposalTypes";
import { parentIdsOf, withheldParentIssue, wouldExceedParentCardinality } from "./validationRules";

const RULE_TITLES: Record<string, string> = {
  "shared-parent-full-sibling": "Shared Parent -> Sibling",
  "shared-parent-sibling": "Shared Parent -> Sibling",
  "shared-child-spouse": "Shared Child -> Spouse",
  "full-sibling-parent-shared": "Sibling's Parent -> Shared Parent",
  "sibling-parent-shared": "Sibling's Parent -> Shared Parent",
  "half-sibling-shared-parent": "Half-Sibling -> Shared Parent Choice",
  "shared-sibling-also-sibling": "Shared Sibling -> Also Sibling",
  "parent-chain-grandparent": "Parent's Parent -> Grandparent",
  "parent-sibling-aunt-uncle": "Parent's Sibling -> Aunt/Uncle",
  "sibling-parents-cousin": "Parents Are Siblings -> Cousin",
  "spouse-parent-in-law": "Spouse's Parent -> Parent-in-Law",
  "spouse-sibling-in-law": "Spouse's Sibling -> Sibling-in-Law",
  "grandparent-spouse": "Grandparent's Spouse -> Also Grandparent",
  "shared-grandparent-cousin": "Shared Grandparent -> Cousin",
  "grandparent-child-parent": "Grandparent's Child -> Parent",
  "shared-manager-coworker": "Shared Manager -> Coworker",
  "mutual-friends-friend": "Two Shared Friends -> Friend",
  "friend-of-friend-acquaintance": "Friend of a Friend -> Acquaintance",
  "shared-work-connection-coworker": "Shared Work Contact -> Coworker",
  "shared-romantic-history-complicated": "Shared Romantic History -> Complicated",
  "shared-roommate-friend": "Shared Roommate -> Friend",
};

function outputTypeForFact(fact: Fact): string {
  switch (fact.predicate) {
    case "parent":
      return "parent";
    case "sibling":
      if (fact.subtype === "half") return "half-sibling";
      if (fact.subtype === "step") return "step-sibling";
      return "sibling";
    case "spouse":
      return "spouse";
    case "grandparent":
      return "grandparent";
    case "auntUncle":
      return "aunt/uncle";
    case "cousin":
      return "cousin";
    case "manages":
      return "manager";
    case "coworker":
      return "coworker";
    case "friend":
      return "friend";
    case "acquaintance":
      return "acquaintance";
    case "complicated":
      return "complicated";
    case "parentInLaw":
      return "parent-in-law";
    case "siblingInLaw":
      return "sibling-in-law";
    default:
      return "custom";
  }
}

function explanationForFact(fact: Fact, peopleMap?: Map<string, string>): string {
  const title = RULE_TITLES[fact.ruleId ?? ""] ?? fact.ruleId ?? "Relationship rule";

  const getName = (id: string) => peopleMap?.get(id) ?? id;

  const evidence = fact.evidence
    ?.map((item) => `${getName(item.args[0])} -> ${getName(item.args[1])}`)
    .join("; ");
  return evidence ? `${title}: ${evidence}` : title;
}

function draftForFact(fact: Fact): RelationshipInput {
  const type = outputTypeForFact(fact);
  const defaults = getTypeDefaults(type) as {
    category: RelationshipCategory;
    direction: RelationshipDirection;
  };
  const args = fact.proposalArgs ?? fact.args;

  return {
    source: args[0],
    target: args[1],
    category: defaults.category,
    type,
    direction: defaults.direction,
  };
}

export function proposalsFromFacts(
  facts: Fact[],
  baseFacts: Fact[],
  people?: Array<{ id: string; name: string }>,
): { proposals: RelationshipProposal[]; issues: ValidationIssue[] } {
  const peopleMap = people ? new Map(people.map((p) => [p.id, p.name])) : undefined;
  const baseKeys = new Set(baseFacts.map(factKey));
  const proposedKeys = new Set<string>();
  const proposals: RelationshipProposal[] = [];
  const issues: ValidationIssue[] = [];

  for (const fact of facts.filter((item) => item.source === "derived")) {
    const key = factKey(fact);
    if (baseKeys.has(key) || proposedKeys.has(key)) continue;
    if (fact.args[0] === fact.args[1]) continue;

    // Universal duplicate check: skip if any relationship exists between the pair
    if (baseFacts.some(existing =>
      (existing.args[0] === fact.args[0] && existing.args[1] === fact.args[1]) ||
      (existing.args[0] === fact.args[1] && existing.args[1] === fact.args[0])
    )) continue;

    if (fact.predicate === "parent" && wouldExceedParentCardinality(baseFacts, fact.args[0], fact.args[1])) {
      issues.push(withheldParentIssue(fact, baseFacts));
      continue;
    }

    const confidence = confidenceForFact(fact, baseFacts);
    const parentIds = fact.predicate === "parent" ? parentIdsOf(baseFacts, fact.args[1]) : new Set<string>();
    const notes =
      fact.predicate === "parent" && parentIds.size === 1 && !parentIds.has(fact.args[0])
        ? "Accepting this would fill the second recorded parent slot."
        : undefined;
    proposals.push({
      ruleId: fact.ruleId ?? "derived-relationship",
      explanation: explanationForFact(fact, peopleMap),
      evidence: fact.evidence ?? [],
      confidence,
      prechecked: shouldPrecheck(confidence),
      derivationDepth: fact.derivationDepth,
      draft: { ...draftForFact(fact), notes },
    });
    proposedKeys.add(key);
  }

  proposals.sort((a, b) => {
    const confidenceOrder = confidenceRank[a.confidence] - confidenceRank[b.confidence];
    if (confidenceOrder !== 0) return confidenceOrder;
    const typeOrder = a.draft.type.localeCompare(b.draft.type);
    if (typeOrder !== 0) return typeOrder;
    const sourceOrder = a.draft.source.localeCompare(b.draft.source);
    if (sourceOrder !== 0) return sourceOrder;
    const targetOrder = a.draft.target.localeCompare(b.draft.target);
    if (targetOrder !== 0) return targetOrder;
    return a.ruleId.localeCompare(b.ruleId);
  });

  return { proposals, issues };
}

export function ruleTitle(ruleId: string): string {
  return RULE_TITLES[ruleId] ?? ruleId;
}