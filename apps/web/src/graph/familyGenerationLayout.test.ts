import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "../types";
import { buildFamilyGenerationLayout } from "./familyGenerationLayout";

function person(id: string, name = id): Person {
  return {
    id,
    name,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function relationship(
  id: string,
  source: string,
  target: string,
  type: string,
  category: Relationship["category"] = "family",
  direction: Relationship["direction"] = "one-way",
): Relationship {
  return {
    id,
    source,
    target,
    type,
    category,
    direction,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

describe("buildFamilyGenerationLayout", () => {
  it("returns hasFamily false when the root has no family relationships", () => {
    const people = [person("root", "Root"), person("friend", "Friend")];
    const relationships = [relationship("r1", "root", "friend", "friend", "friend", "two-way")];

    const layout = buildFamilyGenerationLayout(people, relationships, "root");

    expect(layout.hasFamily).toBe(false);
    expect(layout.generationByPersonId.get("root")).toBe(0);
    expect(layout.generationByPersonId.has("friend")).toBe(false);
  });

  it("places parents above the root", () => {
    const people = [person("parent", "Parent"), person("root", "Root")];
    const relationships = [relationship("r1", "parent", "root", "parent")];

    const layout = buildFamilyGenerationLayout(people, relationships, "root");

    expect(layout.hasFamily).toBe(true);
    expect(layout.generationByPersonId.get("parent")).toBe(1);
    expect(layout.roleByPersonId.get("parent")).toBe("parent");
    expect(layout.primaryFamilyEdgeIds.has("r1")).toBe(true);
  });

  it("derives siblings from shared parents when there is no explicit sibling edge", () => {
    const people = [
      person("mom", "Mom"),
      person("root", "Root"),
      person("sibling", "Sibling"),
    ];
    const relationships = [
      relationship("r1", "mom", "root", "parent"),
      relationship("r2", "mom", "sibling", "parent"),
    ];

    const layout = buildFamilyGenerationLayout(people, relationships, "root");

    expect(layout.generationByPersonId.get("sibling")).toBe(0);
    expect(layout.roleByPersonId.get("sibling")).toBe("sibling");
    expect(layout.primaryFamilyEdgeIds.has("r1")).toBe(true);
    expect(layout.primaryFamilyEdgeIds.has("r2")).toBe(true);
  });

  it("treats partner relationships as generation-zero family triggers", () => {
    const people = [person("root", "Root"), person("partner", "Partner")];
    const relationships = [relationship("r1", "root", "partner", "partner", "romantic", "two-way")];

    const layout = buildFamilyGenerationLayout(people, relationships, "root");

    expect(layout.hasFamily).toBe(true);
    expect(layout.generationByPersonId.get("partner")).toBe(0);
    expect(layout.roleByPersonId.get("partner")).toBe("spouse");
    expect(layout.primaryFamilyEdgeIds.has("r1")).toBe(true);
  });

  it("keeps a direct grandparent shortcut secondary when a parent chain exists", () => {
    const people = [
      person("grandparent", "Grandparent"),
      person("parent", "Parent"),
      person("root", "Root"),
    ];
    const relationships = [
      relationship("r1", "grandparent", "parent", "parent"),
      relationship("r2", "parent", "root", "parent"),
      relationship("r3", "grandparent", "root", "grandparent"),
    ];

    const layout = buildFamilyGenerationLayout(people, relationships, "root");

    expect(layout.generationByPersonId.get("grandparent")).toBe(2);
    expect(layout.primaryFamilyEdgeIds.has("r1")).toBe(true);
    expect(layout.primaryFamilyEdgeIds.has("r2")).toBe(true);
    expect(layout.secondaryFamilyEdgeIds.has("r3")).toBe(true);
  });

  it("places children and grandchildren below the root", () => {
    const people = [
      person("root", "Root"),
      person("child", "Child"),
      person("grandchild", "Grandchild"),
    ];
    const relationships = [
      relationship("r1", "root", "child", "parent"),
      relationship("r2", "child", "grandchild", "parent"),
    ];

    const layout = buildFamilyGenerationLayout(people, relationships, "root");

    expect(layout.generationByPersonId.get("child")).toBe(-1);
    expect(layout.generationByPersonId.get("grandchild")).toBe(-2);
    expect(layout.primaryFamilyEdgeIds.has("r1")).toBe(true);
    expect(layout.primaryFamilyEdgeIds.has("r2")).toBe(true);
  });
});