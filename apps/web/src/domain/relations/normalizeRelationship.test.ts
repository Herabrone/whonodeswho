import { describe, expect, it } from "vitest";
import { createRelationshipKey } from "./relationMatcher";
import { normalizeRelationship } from "./normalizeRelationship";

describe("normalizeRelationship", () => {
  it("normalizes child input to the same parent fact as parent input", () => {
    const parent = normalizeRelationship({ source: "P", target: "C", type: "parent" });
    const child = normalizeRelationship({ source: "C", target: "P", type: "child" });

    expect(parent).toMatchObject({ predicate: "parent", args: ["P", "C"] });
    expect(child).toMatchObject({ predicate: "parent", args: ["P", "C"] });
  });

  it("normalizes sibling variants to one sorted sibling predicate with subtype", () => {
    expect(normalizeRelationship({ source: "B", target: "A", type: "half-sibling" })).toMatchObject({
      predicate: "sibling",
      args: ["A", "B"],
      subtype: "half",
    });
    expect(createRelationshipKey("B", "A", "step-sibling")).toBe(
      createRelationshipKey("A", "B", "sibling"),
    );
  });

  it("normalizes employee input to the same management fact as manager input", () => {
    const manager = normalizeRelationship({ source: "M", target: "R", type: "manager" });
    const employee = normalizeRelationship({ source: "R", target: "M", type: "employee" });

    expect(manager).toMatchObject({ predicate: "manages", args: ["M", "R"] });
    expect(employee).toMatchObject({ predicate: "manages", args: ["M", "R"] });
  });
});