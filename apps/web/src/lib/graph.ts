/**
 * RelationFlow — GRAPH ALGORITHM PRIMITIVES
 * Pure, framework-free functions. Foundation owns these; Track B orchestrates
 * them into Focus Mode and Degrees-of-Separation features.
 *
 * All functions treat relationships as UNDIRECTED for traversal purposes
 * (a "one-way" father->child link still connects the two people in the graph).
 */
import type { GraphData, Relationship, XYPosition } from "../types";

/** Adjacency list: personId -> Set of connected personIds. */
export type Adjacency = Map<string, Set<string>>;

/** Build an undirected adjacency list from the graph. O(V + E). */
export function buildAdjacency(graph: GraphData): Adjacency {
  const adj: Adjacency = new Map();
  for (const p of graph.people) adj.set(p.id, new Set());
  for (const r of graph.relationships) {
    if (!adj.has(r.source)) adj.set(r.source, new Set());
    if (!adj.has(r.target)) adj.set(r.target, new Set());
    adj.get(r.source)!.add(r.target);
    adj.get(r.target)!.add(r.source);
  }
  return adj;
}

/** Direct neighbours of a person. */
export function getNeighbors(adj: Adjacency, personId: string): string[] {
  return [...(adj.get(personId) ?? [])];
}

/**
 * All people reachable within `degrees` hops of `startId` (inclusive of start).
 * `degrees` of "all" returns the entire connected component.
 */
export function getNodesWithinDegrees(
  adj: Adjacency,
  startId: string,
  degrees: number | "all",
): Set<string> {
  const result = new Set<string>();
  if (!adj.has(startId)) return result;
  const maxDepth = degrees === "all" ? Infinity : degrees;
  const queue: Array<{ id: string; depth: number }> = [
    { id: startId, depth: 0 },
  ];
  result.add(startId);
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;
    for (const next of adj.get(id) ?? []) {
      if (!result.has(next)) {
        result.add(next);
        queue.push({ id: next, depth: depth + 1 });
      }
    }
  }
  return result;
}

/**
 * Shortest path between two people (BFS). Returns the ordered list of person
 * ids from start to target inclusive, or null if no path exists.
 */
export function findShortestPath(
  adj: Adjacency,
  startId: string,
  targetId: string,
): string[] | null {
  if (!adj.has(startId) || !adj.has(targetId)) return null;
  if (startId === targetId) return [startId];
  const visited = new Set<string>([startId]);
  const queue: string[][] = [[startId]];
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    for (const next of adj.get(current) ?? []) {
      if (next === targetId) return [...path, next];
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

/** Resolve the relationship edge ids that connect a sequential path of people. */
export function pathEdgeIds(
  graph: GraphData,
  path: string[],
): string[] {
  const ids: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const edge = graph.relationships.find(
      (r: Relationship) =>
        (r.source === a && r.target === b) ||
        (r.source === b && r.target === a),
    );
    if (edge) ids.push(edge.id);
  }
  return ids;
}

/**
 * Deterministic circular auto-layout. Used to place people that have no saved
 * position yet. Stable for a given index so re-renders don't jump.
 */
export function autoLayout(
  index: number,
  total: number,
  center: XYPosition = { x: 0, y: 0 },
): XYPosition {
  const radius = 120 + total * 22;
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}
