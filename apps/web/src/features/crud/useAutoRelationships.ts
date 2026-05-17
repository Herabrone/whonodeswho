import { canonicalizeRelationKind } from "../../domain/relations/relationAliases";
import { createRelationshipKey } from "../../domain/relations/relationMatcher";
import { getTypeDefaults } from "../../domain/relations/relationKinds";
import type { Fact } from "../../domain/rules/facts";
import type { RelationshipProposal, ValidationIssue } from "../../domain/rules/proposalTypes";
import { ruleTitle } from "../../domain/rules/proposalRules";
import { runRelationshipInference } from "../../domain/rules/ruleEngine";
import type {
  Person,
  Relationship,
  RelationshipCategory,
  RelationshipDirection,
  RelationshipInput,
} from "../../types";

export { createRelationshipKey };

export type ProposalConfidence = "High" | "Medium" | "Low";

export interface ProposedRelationship {
  source: string;
  target: string;
  category: RelationshipCategory;
  type: string;
  direction: RelationshipDirection;
  notes?: string;
  rule: string;
  reason: string;
  confidence: ProposalConfidence;
  prechecked?: boolean;
  ruleId?: string;
  derivationDepth?: number;
  evidence?: RelationshipProposal["evidence"];
}

export interface AutoRelationshipInference {
  facts: Fact[];
  proposals: ProposedRelationship[];
  issues: ValidationIssue[];
}

function primaryDraft(
  relationshipType: string,
  sourceId: string,
  targetId: string,
  category: RelationshipCategory,
): RelationshipInput {
  const defaults = getTypeDefaults(canonicalizeRelationKind(relationshipType));
  return {
    source: sourceId,
    target: targetId,
    category: category ?? defaults.category,
    type: relationshipType,
    direction: defaults.direction,
  };
}

function toProposedRelationship(proposal: RelationshipProposal): ProposedRelationship {
  const title = ruleTitle(proposal.ruleId);
  const reason = proposal.explanation.startsWith(`${title}: `)
    ? proposal.explanation.slice(title.length + 2)
    : proposal.explanation;

  return {
    source: proposal.draft.source,
    target: proposal.draft.target,
    category: proposal.draft.category,
    type: proposal.draft.type,
    direction: proposal.draft.direction,
    notes: proposal.draft.notes,
    rule: title,
    reason,
    confidence: proposal.confidence,
    prechecked: proposal.prechecked,
    ruleId: proposal.ruleId,
    derivationDepth: proposal.derivationDepth,
    evidence: proposal.evidence,
  };
}

export function inferAutoRelationships(
  primary: RelationshipInput,
  relationships: Relationship[],
  people?: Person[],
): AutoRelationshipInference {
  const result = runRelationshipInference({
    existingRelationships: relationships,
    primary,
    people,
  });

  return {
    facts: result.facts,
    issues: result.issues,
    proposals: result.proposals.map(toProposedRelationship),
  };
}

export function useAutoRelationships(
  relationshipType: string,
  sourceId: string,
  targetId: string,
  category: RelationshipCategory,
  people: Person[],
  relationships: Relationship[],
): ProposedRelationship[] {
  return inferAutoRelationships(
    primaryDraft(relationshipType, sourceId, targetId, category),
    relationships,
    people,
  ).proposals;
}

export default useAutoRelationships;