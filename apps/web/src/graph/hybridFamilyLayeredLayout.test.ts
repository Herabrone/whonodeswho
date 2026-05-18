import { describe, expect, it } from "vitest";
import type { GraphData, RelationshipCategory } from "../types";
import { buildFamilyGenerationLayout } from "./familyGenerationLayout";
import { computeHybridFamilyLayeredLayout } from "./hybridFamilyLayeredLayout";

function person(id: string, name = id): GraphData["people"][number] {
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
  category: RelationshipCategory = "family",
  direction: GraphData["relationships"][number]["direction"] = "one-way",
): GraphData["relationships"][number] {
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

describe("computeHybridFamilyLayeredLayout", () => {
  it("places ancestors above the root and descendants below it", () => {
    const graph: GraphData = {
      people: [
        person("grandparent", "Grandparent"),
        person("parent", "Parent"),
        person("root", "Root"),
        person("child", "Child"),
        person("grandchild", "Grandchild"),
      ],
      relationships: [
        relationship("r1", "grandparent", "parent", "parent"),
        relationship("r2", "parent", "root", "parent"),
        relationship("r3", "root", "child", "parent"),
        relationship("r4", "child", "grandchild", "parent"),
      ],
    };

    const familyLayout = buildFamilyGenerationLayout(graph.people, graph.relationships, "root");
    const layout = computeHybridFamilyLayeredLayout(graph, "root", familyLayout);

    expect(layout.positions.grandparent.y).toBeLessThan(layout.positions.parent.y);
    expect(layout.positions.parent.y).toBeLessThan(layout.positions.root.y);
    expect(layout.positions.root.y).toBeLessThan(layout.positions.child.y);
    expect(layout.positions.child.y).toBeLessThan(layout.positions.grandchild.y);
  });

  it("keeps non-family branches to the right of the semantic family cluster", () => {
    const graph: GraphData = {
      people: [
        person("parent", "Parent"),
        person("root", "Root"),
        person("coworker", "Coworker"),
        person("friend", "Friend"),
      ],
      relationships: [
        relationship("r1", "parent", "root", "parent"),
        relationship("r2", "root", "coworker", "coworker", "work", "two-way"),
        relationship("r3", "coworker", "friend", "friend", "friend", "two-way"),
      ],
    };

    const familyLayout = buildFamilyGenerationLayout(graph.people, graph.relationships, "root");
    const layout = computeHybridFamilyLayeredLayout(graph, "root", familyLayout);
    const familyMaxX = Math.max(layout.positions.root.x, layout.positions.parent.x);

    expect(layout.positions.parent.y).toBeLessThan(layout.positions.root.y);
    expect(layout.positions.coworker.x).toBeGreaterThan(familyMaxX);
    expect(layout.positions.friend.x).toBeGreaterThan(layout.positions.root.x);
    expect(layout.edgeRoleById.get("r2")).toBe("bfs-primary");
    expect(layout.edgeRoleById.get("r3")).toBe("bfs-primary");
  });

  it("marks direct grandparent shortcuts as family-secondary", () => {
    const graph: GraphData = {
      people: [
        person("grandparent", "Grandparent"),
        person("parent", "Parent"),
        person("root", "Root"),
      ],
      relationships: [
        relationship("r1", "grandparent", "parent", "parent"),
        relationship("r2", "parent", "root", "parent"),
        relationship("r3", "grandparent", "root", "grandparent"),
      ],
    };

    const familyLayout = buildFamilyGenerationLayout(graph.people, graph.relationships, "root");
    const layout = computeHybridFamilyLayeredLayout(graph, "root", familyLayout);

    expect(layout.edgeRoleById.get("r1")).toBe("family-primary");
    expect(layout.edgeRoleById.get("r2")).toBe("family-primary");
    expect(layout.edgeRoleById.get("r3")).toBe("family-secondary");
  });

  it("parks disconnected people below the reachable cluster", () => {
    const graph: GraphData = {
      people: [
        person("parent", "Parent"),
        person("root", "Root"),
        person("child", "Child"),
        person("isolated", "Isolated"),
      ],
      relationships: [
        relationship("r1", "parent", "root", "parent"),
        relationship("r2", "root", "child", "parent"),
      ],
    };

    const familyLayout = buildFamilyGenerationLayout(graph.people, graph.relationships, "root");
    const layout = computeHybridFamilyLayeredLayout(graph, "root", familyLayout);
    const reachableY = ["parent", "root", "child"].map((id) => layout.positions[id].y);

    expect(layout.positions.isolated.y).toBeGreaterThan(Math.max(...reachableY));
  });
});