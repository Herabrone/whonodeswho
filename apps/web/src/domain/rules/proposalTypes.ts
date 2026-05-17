import type { RelationshipInput } from "../../types";
import type { Fact, FactReference } from "./facts";

export type ProposalConfidence = "High" | "Medium" | "Low";
export type ValidationSeverity = "fatal" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  code:
    | "self-link"
    | "duplicate-relationship"
    | "parent-cycle"
    | "parent-cardinality"
    | "withheld-proposal";
  message: string;
  fact?: FactReference;
}

export interface RelationshipProposal {
  ruleId: string;
  explanation: string;
  evidence: FactReference[];
  confidence: ProposalConfidence;
  prechecked: boolean;
  derivationDepth: number;
  draft: RelationshipInput;
}

export interface InferenceResult {
  facts: Fact[];
  proposals: RelationshipProposal[];
  issues: ValidationIssue[];
}

export interface InferenceRequest {
  existingRelationships: Array<RelationshipInput & { id?: string }>;
  primary: RelationshipInput;
  maxIterations?: number;
  people?: Array<{ id: string; name: string }>;
}