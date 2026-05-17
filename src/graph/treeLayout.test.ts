import { describe, expect, it } from "vitest";
import type { GraphData, RelationshipCategory } from "../types";
import { computeCategoryTree } from "./treeLayout";

function person(id: string, name = id): GraphData["people"][number] {
  return {
    id,
    name,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function rel(
  id: string,
  source: string,
  target: string,
  category: RelationshipCategory,
  type = `${category}-${id}`,
): GraphData["relationships"][number] {
  return {
    id,
    source,
    target,
    type,
    category,
    direction: "two-way",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

describe("computeCategoryTree", () => {
  const graph: GraphData = {
    people: [
      person("root", "Root"),
      person("a", "Alice"),
      person("b", "Bob"),
      person("c", "Carol"),
      person("d", "Dan"),
      person("x", "Xena"),
    ],
    relationships: [
      rel("r1", "root", "a", "family", "sibling"),
      rel("r2", "root", "b", "friend", "friend"),
      rel("r3", "root", "a", "work", "coworker"),
      rel("r4", "root", "c", "work", "manager"),
      rel("r5", "b", "d", "friend", "friend"),
    ],
  };

  it("shows only non-empty categories in fixed order", () => {
    const layout = computeCategoryTree(graph, "root");
    expect(layout.categoryNodes.map((node) => node.category)).toEqual([
      "family",
      "friend",
      "work",
    ]);
  });

  it("duplicates a person when they are connected in multiple categories", () => {
    const layout = computeCategoryTree(graph, "root");
    const personTargets = layout.personEdges
      .filter((edge) => edge.originalRelationshipId === "r1" || edge.originalRelationshipId === "r3")
      .map((edge) => edge.target)
      .sort();

    expect(personTargets).toEqual(["tree-family-a", "tree-work-a"]);
  });

  it("parks disconnected people in a right-side column", () => {
    const layout = computeCategoryTree(graph, "root");
    expect(layout.disconnectedIds).toEqual(["d", "x"]);

    const dPos = layout.personPositions.d;
    const xPos = layout.personPositions.x;
    expect(dPos).toBeDefined();
    expect(xPos).toBeDefined();
    expect(xPos.y).toBeGreaterThan(dPos.y);
    expect(xPos.x).toBe(dPos.x);
  });
});
