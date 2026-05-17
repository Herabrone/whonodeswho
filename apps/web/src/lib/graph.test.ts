import { describe, it, expect } from "vitest";
import {
  buildAdjacency,
  getNeighbors,
  getNodesWithinDegrees,
  findShortestPath,
  pathEdgeIds,
} from "./graph";
import type { GraphData } from "../types";

function rel(id: string, source: string, target: string): GraphData["relationships"][number] {
  return {
    id,
    source,
    target,
    type: "friend",
    category: "friend",
    direction: "two-way",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function person(id: string): GraphData["people"][number] {
  return {
    id,
    name: id,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

// a — b — c — d ,  a — e
const graph: GraphData = {
  people: ["a", "b", "c", "d", "e", "z"].map(person),
  relationships: [
    rel("r1", "a", "b"),
    rel("r2", "b", "c"),
    rel("r3", "c", "d"),
    rel("r4", "a", "e"),
  ],
};

describe("graph primitives", () => {
  const adj = buildAdjacency(graph);

  it("finds direct neighbours", () => {
    expect(getNeighbors(adj, "a").sort()).toEqual(["b", "e"]);
  });

  it("collects nodes within N degrees", () => {
    expect([...getNodesWithinDegrees(adj, "a", 1)].sort()).toEqual([
      "a",
      "b",
      "e",
    ]);
    expect([...getNodesWithinDegrees(adj, "a", 2)].sort()).toEqual([
      "a",
      "b",
      "c",
      "e",
    ]);
  });

  it("returns whole component for 'all'", () => {
    expect([...getNodesWithinDegrees(adj, "a", "all")].sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("finds the shortest path", () => {
    expect(findShortestPath(adj, "a", "d")).toEqual(["a", "b", "c", "d"]);
  });

  it("returns null when no path exists", () => {
    expect(findShortestPath(adj, "a", "z")).toBeNull();
  });

  it("resolves edge ids along a path", () => {
    expect(pathEdgeIds(graph, ["a", "b", "c"])).toEqual(["r1", "r2"]);
  });
});
