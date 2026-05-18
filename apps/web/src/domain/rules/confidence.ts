import type { Fact } from "./facts";
import type { ProposalConfidence } from "./proposalTypes";
import { maxEvidenceDepth, parentIdsOf } from "./validationRules";

const CONFIDENCE_ORDER: ProposalConfidence[] = ["Low", "Medium", "High"];

function demote(confidence: ProposalConfidence, steps: number): ProposalConfidence {
  const index = CONFIDENCE_ORDER.indexOf(confidence);
  return CONFIDENCE_ORDER[Math.max(0, index - steps)];
}

function capAt(confidence: ProposalConfidence, cap: ProposalConfidence): ProposalConfidence {
  return CONFIDENCE_ORDER[Math.min(CONFIDENCE_ORDER.indexOf(confidence), CONFIDENCE_ORDER.indexOf(cap))];
}

function baseConfidence(fact: Fact): ProposalConfidence {
  switch (fact.ruleId) {
    case "shared-parent-full-sibling":
    case "full-sibling-parent-shared":
    case "parent-chain-grandparent":
    case "spouse-parent-in-law":
    case "spouse-sibling-in-law":
    case "grandparent-spouse":
    case "grandparent-child-parent":
    case "shared-manager-coworker":
      return "High";
    case "shared-parent-sibling":
    case "shared-child-spouse":
    case "sibling-parent-shared":
    case "shared-sibling-also-sibling":
    case "parent-sibling-aunt-uncle":
    case "sibling-parents-cousin":
    case "shared-grandparent-cousin":
    case "mutual-friends-friend":
    case "shared-work-connection-coworker":
    case "shared-roommate-friend":
      return "Medium";
    case "half-sibling-shared-parent":
    case "friend-of-friend-acquaintance":
    case "shared-romantic-history-complicated":
      return "Low";
    default:
      return "Medium";
  }
}

export function confidenceForFact(fact: Fact, baseFacts: Fact[]): ProposalConfidence {
  let confidence = baseConfidence(fact);

  const evidenceDepth = maxEvidenceDepth(fact.evidence);
  if (evidenceDepth > 0) {
    confidence = demote(confidence, evidenceDepth);
  }

  if (fact.derivationDepth >= 2) {
    confidence = capAt(confidence, "Medium");
  }

  if (fact.predicate === "parent") {
    const parentIds = parentIdsOf(baseFacts, fact.args[1]);
    if (!parentIds.has(fact.args[0]) && parentIds.size === 1) {
      confidence = demote(confidence, 1);
    }
  }

  return confidence;
}

export function shouldPrecheck(confidence: ProposalConfidence): boolean {
  return confidence === "High";
}

export const confidenceRank: Record<ProposalConfidence, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};