import { describe, expect, it } from "vitest";
import type { Relationship, RelationshipInput } from "../../types";
import { runRelationshipInference } from "./ruleEngine";
import { validateRelationshipDrafts } from "./validationRules";

let idCounter = 0;

function relationship(
  source: string,
  target: string,
  type: string,
  category: Relationship["category"] = "family",
  direction: Relationship["direction"] = "one-way",
): Relationship {
  return {
    id: `r${++idCounter}`,
    source,
    target,
    type,
    category,
    direction,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function draft(
  source: string,
  target: string,
  type: string,
  category: RelationshipInput["category"] = "family",
  direction: RelationshipInput["direction"] = "one-way",
): RelationshipInput {
  return { source, target, type, category, direction };
}

function proposalKey(proposal: ReturnType<typeof runRelationshipInference>["proposals"][number]): string {
  return `${proposal.draft.source}->${proposal.draft.target}:${proposal.draft.type}`;
}

describe("runRelationshipInference", () => {
  it("derives aunt/uncle proposals from a sibling and child fact", () => {
    const result = runRelationshipInference({
      existingRelationships: [relationship("A", "C", "parent")],
      primary: draft("A", "B", "sibling", "family", "two-way"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "parent-sibling-aunt-uncle",
        confidence: "Medium",
        derivationDepth: 1,
        draft: expect.objectContaining({ source: "B", target: "C", type: "aunt/uncle" }),
      }),
    );
  });

  it("derives cousin proposals at depth two when parent siblings are themselves derived", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("P", "A", "parent"),
        relationship("P", "B", "parent"),
        relationship("A", "C", "parent"),
      ],
      primary: draft("B", "D", "parent"),
    });

    const cousin = result.proposals.find(
      (proposal) =>
        proposal.ruleId === "sibling-parents-cousin" &&
        proposal.draft.source === "C" &&
        proposal.draft.target === "D" &&
        proposal.draft.type === "cousin",
    );

    expect(cousin).toBeDefined();
    expect(cousin?.derivationDepth).toBe(2);
    expect(["Medium", "Low"]).toContain(cousin?.confidence);
  });

  it("suppresses a duplicate proposal when the duplicate fact is derived", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("P", "A", "parent"),
        relationship("P", "B", "parent"),
      ],
      primary: draft("A", "B", "sibling", "family", "two-way"),
    });

    expect(result.proposals.filter((proposal) => proposal.draft.type === "sibling")).toHaveLength(0);
  });

  it("withholds parent proposals that would introduce a third recorded parent", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("P1", "A", "parent"),
        relationship("P2", "A", "parent"),
        relationship("P3", "B", "parent"),
      ],
      primary: draft("B", "A", "sibling", "family", "two-way"),
    });

    expect(result.proposals.map(proposalKey)).not.toContain("P3->A:parent");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "withheld-proposal" }),
    );
  });

  it("does not derive shared biological parents from step-siblings", () => {
    const result = runRelationshipInference({
      existingRelationships: [relationship("Mom", "A", "parent")],
      primary: draft("A", "B", "step-sibling", "family", "two-way"),
    });

    expect(result.proposals.map(proposalKey)).not.toContain("Mom->B:parent");
  });

  it("does not derive co-parenthood from spouse or partner relationships", () => {
    const result = runRelationshipInference({
      existingRelationships: [relationship("A", "Child", "parent")],
      primary: draft("A", "B", "spouse", "romantic", "two-way"),
    });

    expect(result.proposals.map(proposalKey)).not.toContain("B->Child:parent");
  });

  it("suggests a spouse relationship when a second parent is added for a child", () => {
    const result = runRelationshipInference({
      existingRelationships: [relationship("Mother", "A", "parent")],
      primary: draft("Father", "A", "parent"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "shared-child-spouse",
        confidence: "Medium",
        prechecked: false,
        draft: expect.objectContaining({ source: "Mother", target: "Father", type: "spouse" }),
      }),
    );
  });

  it("uses a derived co-parent spouse fact to suggest parent-in-law relationships", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("Grandmother", "Mother", "parent"),
        relationship("Mother", "A", "parent"),
      ],
      primary: draft("Father", "A", "parent"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "spouse-parent-in-law",
        draft: expect.objectContaining({ source: "Grandmother", target: "Father", type: "parent-in-law" }),
      }),
    );
  });

  it("surfaces half-sibling shared parents as low-confidence unchecked choices", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("Mom", "A", "parent"),
        relationship("Dad", "A", "parent"),
      ],
      primary: draft("A", "B", "half-sibling", "family", "two-way"),
    });

    const parentProposals = result.proposals.filter((proposal) => proposal.draft.type === "parent");
    expect(parentProposals).toHaveLength(2);
    expect(parentProposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ confidence: "Low", prechecked: false, draft: expect.objectContaining({ source: "Mom", target: "B" }) }),
        expect.objectContaining({ confidence: "Low", prechecked: false, draft: expect.objectContaining({ source: "Dad", target: "B" }) }),
      ]),
    );
  });

  it("infers only coworkers for shared direct managers", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("Boss", "Manager", "manager", "work"),
        relationship("Manager", "Existing", "manager", "work"),
      ],
      primary: draft("Manager", "New", "manager", "work"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "shared-manager-coworker",
        confidence: "Medium",
        draft: expect.objectContaining({ source: "Existing", target: "New", type: "coworker" }),
      }),
    );
    expect(result.proposals.map(proposalKey)).not.toContain("Boss->New:manager");
  });

  it("treats full-sibling shared-parent proposals as high confidence", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("Mom", "A", "parent"),
        relationship("Dad", "A", "parent"),
      ],
      primary: draft("A", "B", "full-sibling", "family", "two-way"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "full-sibling-parent-shared",
        confidence: "High",
        prechecked: true,
        draft: expect.objectContaining({ source: "Mom", target: "B", type: "parent" }),
      }),
    );
  });
});

describe("validateRelationshipDrafts", () => {
  it("prevents selected half-sibling choices from exceeding two parents", () => {
    const issues = validateRelationshipDrafts(
      [relationship("Existing", "B", "parent")],
      [draft("Mom", "B", "parent"), draft("Dad", "B", "parent")],
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "fatal", code: "parent-cardinality" }),
    );
  });
});