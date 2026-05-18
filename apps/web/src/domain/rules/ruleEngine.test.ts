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
  options: Partial<Pick<Relationship, "autoCreatedReciprocalOfId">> = {},
): Relationship {
  return {
    id: `r${++idCounter}`,
    source,
    target,
    type,
    category,
    direction,
    ...options,
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
  it("does not derive proposals from unrelated graph branches when the new pair is isolated", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("ben", "darian", "sibling", "family", "two-way"),
        relationship("ben", "jay", "parent"),
        relationship("syl", "elisa", "sibling", "family", "two-way"),
      ],
      primary: draft("Ryan", "Oma", "friend", "friend", "two-way"),
    });

    expect(result.proposals).toHaveLength(0);
  });

  it("ignores auto-created reciprocals when scoping an otherwise isolated pair", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("Ryan", "ben", "child", "family", "one-way", { autoCreatedReciprocalOfId: "p-ben" }),
        relationship("Ryan", "darian", "child", "family", "one-way", { autoCreatedReciprocalOfId: "p-darian" }),
        relationship("Oma", "syl", "child", "family", "one-way", { autoCreatedReciprocalOfId: "p-syl" }),
        relationship("Oma", "jay", "child", "family", "one-way", { autoCreatedReciprocalOfId: "p-jay" }),
        relationship("ben", "darian", "sibling", "family", "two-way"),
        relationship("syl", "jay", "sibling", "family", "two-way"),
      ],
      primary: draft("Ryan", "Oma", "friend", "friend", "two-way"),
    });

    expect(result.proposals).toHaveLength(0);
  });

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

  it("does not derive cousin proposals beyond one hop from the new relationship", () => {
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

    expect(cousin).toBeUndefined();
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

  it("does not suggest parent-in-law relationships for participants beyond one hop", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("Grandmother", "Mother", "parent"),
        relationship("Mother", "A", "parent"),
      ],
      primary: draft("Father", "A", "parent"),
    });

    expect(result.proposals.map(proposalKey)).not.toContain("Grandmother->Father:parent-in-law");
  });

  it("limits proposals to one-hop participants from the new relationship", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("Ryan", "Ben", "sibling", "family", "two-way"),
        relationship("Ben", "Child", "parent"),
        relationship("Syl", "Elisa", "sibling", "family", "two-way"),
      ],
      primary: draft("Ryan", "Oma", "spouse", "romantic", "two-way"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "spouse-sibling-in-law",
        draft: expect.objectContaining({ source: "Ben", target: "Oma", type: "sibling-in-law" }),
      }),
    );
    expect(result.proposals.map(proposalKey).every((proposal) => !proposal.includes("Child"))).toBe(true);
    expect(result.proposals.map(proposalKey).every((proposal) => !proposal.includes("Syl"))).toBe(true);
    expect(result.proposals.map(proposalKey).every((proposal) => !proposal.includes("Elisa"))).toBe(true);
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
        confidence: "High",
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

  it("proposes friend when two people share four strong friends", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("Ben", "Cam", "friend", "friend", "two-way"),
        relationship("Ryan", "Dex", "best friend", "friend", "two-way"),
        relationship("Ben", "Dex", "close friend", "friend", "two-way"),
        relationship("Ryan", "Eli", "friend", "friend", "two-way"),
        relationship("Ben", "Eli", "friend", "friend", "two-way"),
        relationship("Ryan", "Fay", "friend", "friend", "two-way"),
        relationship("Ben", "Fay", "friend", "friend", "two-way"),
      ],
      primary: draft("Ryan", "Cam", "friend", "friend", "two-way"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "mutual-friends-friend",
        confidence: "Medium",
        prechecked: false,
        draft: expect.objectContaining({ source: "Ryan", target: "Ben", type: "friend" }),
      }),
    );
  });

  it("does not propose acquaintance when two people share exactly one strong friend", () => {
    const result = runRelationshipInference({
      existingRelationships: [relationship("Ben", "Cam", "best friend", "friend", "two-way")],
      primary: draft("Ryan", "Cam", "friend", "friend", "two-way"),
    });

    expect(result.proposals).not.toContainEqual(
      expect.objectContaining({
        ruleId: "friend-of-friend-acquaintance",
      }),
    );
    expect(result.proposals).not.toContainEqual(
      expect.objectContaining({
        draft: expect.objectContaining({ source: "Ryan", target: "Ben", type: "acquaintance" }),
      }),
    );
  });

  it("proposes medium-confidence coworkers through a shared work contact", () => {
    const result = runRelationshipInference({
      existingRelationships: [relationship("Ben", "Cam", "coworker", "work", "two-way")],
      primary: draft("Ryan", "Cam", "coworker", "work", "two-way"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "shared-work-connection-coworker",
        confidence: "Medium",
        draft: expect.objectContaining({ source: "Ryan", target: "Ben", type: "coworker" }),
      }),
    );
  });

  it("proposes low-confidence complicated when two people share romantic history", () => {
    const result = runRelationshipInference({
      existingRelationships: [relationship("Ben", "Cam", "partner", "romantic", "two-way")],
      primary: draft("Ryan", "Cam", "ex-partner", "romantic", "two-way"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "shared-romantic-history-complicated",
        confidence: "Low",
        prechecked: false,
        draft: expect.objectContaining({ source: "Ryan", target: "Ben", type: "complicated" }),
      }),
    );
  });

  it("proposes friend when two people share a roommate or housemate", () => {
    const result = runRelationshipInference({
      existingRelationships: [relationship("Ben", "Cam", "housemate", "other", "two-way")],
      primary: draft("Ryan", "Cam", "roommate", "other", "two-way"),
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        ruleId: "shared-roommate-friend",
        confidence: "Medium",
        draft: expect.objectContaining({ source: "Ryan", target: "Ben", type: "friend" }),
      }),
    );
  });

  it("renders social suggestion explanations with person names instead of raw ids", () => {
    const result = runRelationshipInference({
      existingRelationships: [
        relationship("p-ben", "p-cam", "friend", "friend", "two-way"),
        relationship("p-ryan", "p-dex", "friend", "friend", "two-way"),
        relationship("p-ben", "p-dex", "friend", "friend", "two-way"),
        relationship("p-ryan", "p-eli", "friend", "friend", "two-way"),
        relationship("p-ben", "p-eli", "friend", "friend", "two-way"),
        relationship("p-ryan", "p-fay", "friend", "friend", "two-way"),
        relationship("p-ben", "p-fay", "friend", "friend", "two-way"),
      ],
      primary: draft("p-ryan", "p-cam", "friend", "friend", "two-way"),
      people: [
        { id: "p-ryan", name: "Ryan" },
        { id: "p-ben", name: "Ben" },
        { id: "p-cam", name: "Cam" },
        { id: "p-dex", name: "Dex" },
        { id: "p-eli", name: "Eli" },
        { id: "p-fay", name: "Fay" },
      ],
    });

    const proposal = result.proposals.find((item) => item.ruleId === "mutual-friends-friend");
    expect(proposal?.explanation).toContain("Two Shared Friends -> Friend");
    expect(proposal?.explanation).toContain("Ben -> Cam");
    expect(proposal?.explanation).toContain("Cam -> Ryan");
    expect(proposal?.explanation).toContain("Ben -> Dex");
    expect(proposal?.explanation).toContain("Dex -> Ryan");
    expect(proposal?.explanation).not.toContain("p-ryan");
    expect(proposal?.explanation).not.toContain("p-ben");
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