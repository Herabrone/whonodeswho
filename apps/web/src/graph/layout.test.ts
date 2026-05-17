import { describe, expect, it } from "vitest";
import { buildTreeStructure, CATEGORY_ORDER, computeTreeLayout } from "./layout";
import type { GraphData, RelationshipCategory } from "../types";

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
): GraphData["relationships"][number] {
  return {
    id,
    source,
    target,
    type: `${category}-${id}`,
    category,
    direction: "two-way",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

const graph: GraphData = {
  people: [
    person("root", "Root"),
    person("famA", "Alice"),
    person("famB", "Bob"),
    person("romA", "Rhea"),
    person("frA", "Finn"),
    person("workA", "Willa"),
    person("othA", "Oz"),
    person("deep", "Deep"),
    person("iso", "Isolated"),
  ],
  relationships: [
    rel("r1", "root", "famB", "family"),
    rel("r2", "root", "workA", "work"),
    rel("r3", "root", "famA", "family"),
    rel("r4", "root", "romA", "romantic"),
    rel("r5", "root", "frA", "friend"),
    rel("r6", "root", "othA", "other"),
    rel("r7", "famA", "deep", "friend"),
  ],
};

function assertCategoryContiguous(categories: RelationshipCategory[]): boolean {
  const seen = new Set<RelationshipCategory>();
  let previous: RelationshipCategory | null = null;

  for (const category of categories) {
    if (category !== previous && seen.has(category)) {
      return false;
    }
    seen.add(category);
    previous = category;
  }

  return true;
}

describe("computeTreeLayout", () => {
  it("places root near center and gives every reachable node a position", () => {
    const layout = computeTreeLayout(graph, "root", "radial");
    const structure = buildTreeStructure(graph, "root");

    expect(Math.abs(layout.root.x)).toBeLessThan(0.001);
    expect(Math.abs(layout.root.y)).toBeLessThan(0.001);

    for (const personId of structure.reachable) {
      expect(layout[personId]).toBeDefined();
    }
  });

  it("orders root children into contiguous category groups", () => {
    const structure = buildTreeStructure(graph, "root");
    const categories = (structure.childrenById.root ?? []).map((childId) => {
      const relationship = graph.relationships.find(
        (r) =>
          (r.source === "root" && r.target === childId) ||
          (r.target === "root" && r.source === childId),
      );
      return relationship?.category ?? "other";
    });

    expect(assertCategoryContiguous(categories)).toBe(true);

    const uniqueOrder = [...new Set(categories)];
    const sortedByContract = [...uniqueOrder].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
    );
    expect(uniqueOrder).toEqual(sortedByContract);
  });

  it("assigns disconnected people a parked position", () => {
    const layout = computeTreeLayout(graph, "root", "layered");
    expect(layout.iso).toBeDefined();

    const connectedY = Object.entries(layout)
      .filter(([id]) => id !== "iso")
      .map(([, p]) => p.y);

    expect(layout.iso.y).toBeGreaterThan(Math.max(...connectedY));
  });

  it("produces different coordinates for radial vs layered layouts", () => {
    const radial = computeTreeLayout(graph, "root", "radial");
    const layered = computeTreeLayout(graph, "root", "layered");

    const ids = graph.people.map((p) => p.id);
    const different = ids.some((id) => {
      const r = radial[id];
      const l = layered[id];
      if (!r || !l) return false;
      return Math.abs(r.x - l.x) > 0.001 || Math.abs(r.y - l.y) > 0.001;
    });

    expect(different).toBe(true);
  });
});
