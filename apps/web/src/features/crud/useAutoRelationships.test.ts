import { describe, it, expect } from "vitest";
import { createRelationshipKey, useAutoRelationships } from "./useAutoRelationships";
import type { Relationship } from "../../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let _idCounter = 0;
function r(
  source: string,
  target: string,
  type: string,
  category: Relationship["category"] = "family",
  direction: Relationship["direction"] = "one-way",
): Relationship {
  return {
    id: `r${++_idCounter}`,
    source,
    target,
    type,
    category,
    direction,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function run(
  type: string,
  source: string,
  target: string,
  rels: Relationship[],
) {
  return useAutoRelationships(type, source, target, "family", [], rels);
}

function types(proposals: ReturnType<typeof run>) {
  return proposals.map((p) => `${p.source}->${p.target}:${p.type}`).sort();
}

// ---------------------------------------------------------------------------
// Guard: no self-relationships, no duplicates
// ---------------------------------------------------------------------------

describe("guards", () => {
  it("never proposes source === target", () => {
    // Construct a graph where sibling rule would try to add A→A
    const rels = [r("A", "A", "sibling", "family", "two-way")];
    const proposals = run("sibling", "A", "B", rels);
    expect(proposals.every((p) => p.source !== p.target)).toBe(true);
  });

  it("does not reproduce existing relationships", () => {
    // Parent already exists
    const rels = [r("dad", "kid2", "parent")];
    const proposals = run("parent", "dad", "kid", rels);
    // Should NOT propose dad→kid2 parent (already exists) but can propose sibling
    const existing = proposals.filter(
      (p) => p.source === "dad" && p.target === "kid2" && p.type === "parent",
    );
    expect(existing).toHaveLength(0);
  });

  it("does not reproduce the primary relationship itself", () => {
    const proposals = run("sibling", "A", "B", []);
    const primary = proposals.filter(
      (p) => p.source === "A" && p.target === "B" && p.type === "sibling",
    );
    expect(primary).toHaveLength(0);
  });

  it("does not emit duplicate proposals within the same pass", () => {
    const rels = [
      r("P", "A", "parent"),
      r("P", "C", "parent"),
      r("P", "A", "parent"),
    ];
    const proposals = run("sibling", "A", "B", rels);
    const keys = proposals.map((p) => `${p.source}::${p.target}::${p.type}`);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });
});

// ---------------------------------------------------------------------------
// FAMILY — IMMEDIATE
// ---------------------------------------------------------------------------

describe("parent/child rules", () => {
  it("proposes sibling for parent's other children", () => {
    const rels = [r("dad", "kid1", "parent")];
    const proposals = run("parent", "dad", "kid2", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "kid2",
        target: "kid1",
        type: "sibling",
        confidence: "Medium",
        rule: "Shared Parent -> Sibling",
      }),
    );
  });

  it("does not infer a co-parent from a parent's spouse", () => {
    const rels = [r("mom", "dad", "spouse", "romantic", "two-way")];
    const proposals = run("parent", "dad", "kid", rels);
    expect(types(proposals)).not.toContain("mom->kid:parent");
  });

  it("proposes aunt/uncle for parent's siblings", () => {
    const rels = [r("uncle", "dad", "sibling", "family", "two-way")];
    const proposals = run("parent", "dad", "kid", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "uncle",
        target: "kid",
        type: "aunt/uncle",
        confidence: "Medium",
        rule: "Parent's Sibling -> Aunt/Uncle",
      }),
    );
  });

  it("proposes grandparent for parent's parent", () => {
    const rels = [r("gpa", "dad", "parent")];
    const proposals = run("parent", "dad", "kid", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "gpa",
        target: "kid",
        type: "grandparent",
        confidence: "High",
        rule: "Parent's Parent -> Grandparent",
      }),
    );
  });
});

describe("sibling rules", () => {
  it("proposes parent for sibling's parents (source has parents)", () => {
    const rels = [r("mom", "A", "parent")];
    const proposals = run("sibling", "A", "B", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "mom",
        target: "B",
        type: "parent",
        confidence: "Medium",
        rule: "Sibling's Parent -> Shared Parent",
      }),
    );
  });

  it("proposes parent for sibling's parents when B is the source (reverse direction — core directional bug)", () => {
    // User draws edge FROM new person B TO established person A who has parents.
    // The engine must still find A's parents and propose them for B.
    const rels = [r("mom", "A", "parent")];
    const proposals = run("sibling", "B", "A", rels); // <-- B is source this time
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "mom",
        target: "B",
        type: "parent",
        confidence: "Medium",
        rule: "Sibling's Parent -> Shared Parent",
      }),
    );
  });

  it("proposes sibling for target's other siblings", () => {
    const rels = [r("A", "C", "sibling", "family", "two-way")];
    const proposals = run("sibling", "A", "B", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "B",
        target: "C",
        type: "sibling",
        confidence: "Medium",
        rule: "Shared Sibling -> Also Sibling",
      }),
    );
  });

  it("proposes aunt/uncle for sibling's children", () => {
    const rels = [r("A", "child1", "parent")];
    const proposals = run("sibling", "B", "A", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "B",
        target: "child1",
        type: "aunt/uncle",
        confidence: "Medium",
        rule: "Parent's Sibling -> Aunt/Uncle",
      }),
    );
  });
});

describe("spouse rules", () => {
  it("proposes parent-in-law for spouse's parents", () => {
    const rels = [r("fil", "A", "parent")];
    const proposals = run("spouse", "A", "B", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "fil",
        target: "B",
        type: "parent-in-law",
        confidence: "High",
        rule: "Spouse's Parent -> Parent-in-Law",
      }),
    );
  });

  it("proposes sibling-in-law for spouse's siblings", () => {
    const rels = [r("A", "sib", "sibling", "family", "two-way")];
    const proposals = run("spouse", "A", "B", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "sib",
        target: "B",
        type: "sibling-in-law",
        confidence: "High",
        rule: "Spouse's Sibling -> Sibling-in-Law",
      }),
    );
  });
});

describe("grandparent/grandchild rules", () => {
  it("proposes cousin for gp's other grandchildren", () => {
    const rels = [r("gpa", "gc2", "grandparent")];
    const proposals = run("grandparent", "gpa", "gc1", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "gc1",
        target: "gc2",
        type: "cousin",
        confidence: "Medium",
        rule: "Shared Grandparent -> Cousin",
      }),
    );
  });

  it("proposes grandparent for gp's spouse", () => {
    const rels = [r("gpa", "gma", "spouse", "romantic", "two-way")];
    const proposals = run("grandparent", "gpa", "gc", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "gma",
        target: "gc",
        type: "grandparent",
        confidence: "High",
        rule: "Grandparent's Spouse -> Also Grandparent",
      }),
    );
  });

  it("proposes parent for gp's children", () => {
    const rels = [r("gpa", "dad", "parent")];
    const proposals = run("grandparent", "gpa", "gc", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "dad",
        target: "gc",
        type: "parent",
        confidence: "High",
        rule: "Grandparent's Child -> Parent",
      }),
    );
  });
});

describe("manager rules", () => {
  it("proposes coworker for manager's other direct reports", () => {
    const rels = [r("mgr", "emp1", "manager", "work", "one-way")];
    const proposals = run("manager", "mgr", "emp2", rels);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        source: "emp1",
        target: "emp2",
        type: "coworker",
        confidence: "High",
        rule: "Shared Manager -> Coworker",
      }),
    );
  });

  it("does not propose manager's own manager", () => {
    const rels = [r("bigBoss", "mgr", "manager", "work", "one-way")];
    const proposals = run("manager", "mgr", "emp", rels);
    const chain = proposals.find((p) => p.source === "bigBoss" && p.target === "emp");
    expect(chain).toBeUndefined();
  });
});

describe("deterministic-only scope", () => {
  it.each([
    "aunt/uncle",
    "niece/nephew",
    "cousin",
    "step-parent",
    "step-child",
    "half-sibling",
    "parent-in-law",
    "child-in-law",
    "sibling-in-law",
    "mentor",
    "mentee",
  ])("produces no suggestions for out-of-scope trigger %s", (type) => {
    expect(run(type, "A", "B", [r("A", "C", type, "other", "two-way")])).toHaveLength(0);
  });
});

describe("proposal keys", () => {
  it("normalizes symmetric pairs to the same key", () => {
    expect(createRelationshipKey("A", "B", "sibling")).toBe(
      createRelationshipKey("B", "A", "sibling"),
    );
  });

  it("keeps directional pairs distinct for asymmetric types", () => {
    expect(createRelationshipKey("A", "B", "parent")).not.toBe(
      createRelationshipKey("B", "A", "parent"),
    );
  });
});

describe("alias normalization", () => {
  it("treats partner as spouse for in-law inference", () => {
    const rels = [r("parent", "A", "parent")];
    const proposals = run("partner", "A", "B", rels);
    expect(types(proposals)).toContain("parent->B:parent-in-law");
  });

  it("legacy parent/child combined type fires parent rules", () => {
    const rels = [r("A", "kid1", "parent")];
    const proposals = run("parent/child", "A", "kid2", rels);
    expect(types(proposals)).toContain("kid2->kid1:sibling");
  });
});
