import { hierarchy, tree } from "d3-hierarchy";
import { CATEGORY_LABELS } from "../constants";
import { autoLayout, buildAdjacency } from "../lib/graph";
import type { GraphData, Relationship, RelationshipCategory, TreeShape, XYPosition } from "../types";

export const CATEGORY_ORDER: RelationshipCategory[] = [
  "family",
  "romantic",
  "friend",
  "work",
  "education",
  "other",
];

export interface TreeStructure {
  rootId: string;
  parentById: Record<string, string | null>;
  depthById: Record<string, number>;
  childrenById: Record<string, string[]>;
  reachable: Set<string>;
}

export interface RadialCategoryLabel {
  category: RelationshipCategory;
  label: string;
  color: string;
  position: XYPosition;
}

interface TreeHierarchyDatum {
  id: string;
  children: TreeHierarchyDatum[];
}

const CATEGORY_INDEX = new Map(CATEGORY_ORDER.map((category, idx) => [category, idx]));

function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function buildRelationshipLookup(graph: GraphData): Map<string, Relationship> {
  const lookup = new Map<string, Relationship>();

  for (const relationship of graph.relationships) {
    const key = pairKey(relationship.source, relationship.target);
    if (!lookup.has(key)) lookup.set(key, relationship);
  }

  return lookup;
}

function getRelationship(
  lookup: Map<string, Relationship>,
  a: string,
  b: string,
): Relationship | undefined {
  return lookup.get(pairKey(a, b));
}

function childComparator(
  parentId: string,
  peopleById: Map<string, { name: string }>,
  relationshipLookup: Map<string, Relationship>,
): (a: string, b: string) => number {
  return (a, b) => {
    const relA = getRelationship(relationshipLookup, parentId, a);
    const relB = getRelationship(relationshipLookup, parentId, b);

    const idxA = CATEGORY_INDEX.get(relA?.category ?? "other") ?? CATEGORY_ORDER.length;
    const idxB = CATEGORY_INDEX.get(relB?.category ?? "other") ?? CATEGORY_ORDER.length;

    if (idxA !== idxB) return idxA - idxB;

    const nameA = peopleById.get(a)?.name ?? a;
    const nameB = peopleById.get(b)?.name ?? b;
    return nameA.localeCompare(nameB);
  };
}

export function buildTreeStructure(graph: GraphData, rootId: string): TreeStructure {
  const peopleById = new Map(graph.people.map((person) => [person.id, person]));
  const relationshipLookup = buildRelationshipLookup(graph);
  const adj = buildAdjacency(graph);

  const parentById: Record<string, string | null> = { [rootId]: null };
  const depthById: Record<string, number> = { [rootId]: 0 };
  const childrenById: Record<string, string[]> = {};
  const reachable = new Set<string>();

  if (!peopleById.has(rootId)) {
    return {
      rootId,
      parentById: {},
      depthById: {},
      childrenById: {},
      reachable,
    };
  }

  reachable.add(rootId);
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = [...(adj.get(current) ?? [])].sort((a, b) => {
      const nameA = peopleById.get(a)?.name ?? a;
      const nameB = peopleById.get(b)?.name ?? b;
      return nameA.localeCompare(nameB);
    });

    for (const neighbor of neighbors) {
      if (reachable.has(neighbor)) continue;
      reachable.add(neighbor);
      parentById[neighbor] = current;
      depthById[neighbor] = (depthById[current] ?? 0) + 1;
      if (!childrenById[current]) childrenById[current] = [];
      childrenById[current].push(neighbor);
      queue.push(neighbor);
    }
  }

  for (const [parent, children] of Object.entries(childrenById)) {
    children.sort(childComparator(parent, peopleById, relationshipLookup));
  }

  return {
    rootId,
    parentById,
    depthById,
    childrenById,
    reachable,
  };
}

function buildHierarchyData(structure: TreeStructure, nodeId: string): TreeHierarchyDatum {
  const children = structure.childrenById[nodeId] ?? [];
  return {
    id: nodeId,
    children: children.map((childId) => buildHierarchyData(structure, childId)),
  };
}

function parkDisconnected(
  graph: GraphData,
  positions: Record<string, XYPosition>,
  reachable: Set<string>,
): void {
  const disconnected = graph.people
    .filter((person) => !reachable.has(person.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (disconnected.length === 0) return;

  const placed = Object.values(positions);
  const maxY = placed.reduce((acc, point) => Math.max(acc, point.y), 0);
  const startY = maxY + 260;
  const perRow = 6;
  const spacingX = 150;
  const spacingY = 110;

  const totalCols = Math.min(perRow, disconnected.length);
  const firstRowWidth = (totalCols - 1) * spacingX;
  const startX = -firstRowWidth / 2;

  disconnected.forEach((person, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    positions[person.id] = {
      x: startX + col * spacingX,
      y: startY + row * spacingY,
    };
  });
}

export function computeTreeLayout(
  graph: GraphData,
  rootId: string,
  shape: TreeShape,
): Record<string, XYPosition> {
  if (!rootId || graph.people.length === 0) return {};

  const structure = buildTreeStructure(graph, rootId);

  if (!structure.reachable.has(rootId)) {
    return Object.fromEntries(
      graph.people.map((person, index) => [person.id, autoLayout(index, graph.people.length)]),
    );
  }

  const hierarchyRoot = hierarchy<TreeHierarchyDatum>(
    buildHierarchyData(structure, rootId),
    (node) => node.children,
  );
  const positions: Record<string, XYPosition> = {};

  if (shape === "radial") {
    const maxDepth = Math.max(...Object.values(structure.depthById), 0);
    const levelGap = 170;
    const maxRadius = Math.max(220, maxDepth * levelGap);
    const radial = tree<TreeHierarchyDatum>().size([
      Math.PI * 2,
      maxRadius,
    ]);
    const laidOut = radial(hierarchyRoot);

    for (const node of laidOut.descendants()) {
      const angle = node.x - Math.PI / 2;
      const radius = node.y;
      positions[node.data.id] = {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      };
    }
  } else {
    const layered = tree<TreeHierarchyDatum>().nodeSize([170, 160]);
    const laidOut = layered(hierarchyRoot);

    for (const node of laidOut.descendants()) {
      positions[node.data.id] = {
        x: node.x,
        y: node.y,
      };
    }
  }

  parkDisconnected(graph, positions, structure.reachable);
  return positions;
}

export function isTreePrimaryEdge(structure: TreeStructure, source: string, target: string): boolean {
  return structure.parentById[source] === target || structure.parentById[target] === source;
}

export function computeRadialCategoryLabels(
  graph: GraphData,
  rootId: string,
  positions: Record<string, XYPosition>,
  structure: TreeStructure,
  colors: Record<RelationshipCategory, string>,
): RadialCategoryLabel[] {
  const relationshipLookup = buildRelationshipLookup(graph);
  const rootChildren = structure.childrenById[rootId] ?? [];

  if (rootChildren.length === 0) return [];

  const groups = new Map<RelationshipCategory, XYPosition[]>();

  for (const childId of rootChildren) {
    const relationship = getRelationship(relationshipLookup, rootId, childId);
    const category = relationship?.category ?? "other";
    const point = positions[childId];
    if (!point) continue;
    const list = groups.get(category) ?? [];
    list.push(point);
    groups.set(category, list);
  }

  const maxRadius = Object.values(positions).reduce((acc, point) => {
    return Math.max(acc, Math.hypot(point.x, point.y));
  }, 0);
  const labelRadius = maxRadius + 120;

  return CATEGORY_ORDER.flatMap((category) => {
    const points = groups.get(category);
    if (!points || points.length === 0) return [];

    let vecX = 0;
    let vecY = 0;

    for (const point of points) {
      const distance = Math.hypot(point.x, point.y) || 1;
      vecX += point.x / distance;
      vecY += point.y / distance;
    }

    const angle = Math.atan2(vecY, vecX);

    return [
      {
        category,
        label: CATEGORY_LABELS[category],
        color: colors[category],
        position: {
          x: Math.cos(angle) * labelRadius,
          y: Math.sin(angle) * labelRadius,
        },
      },
    ];
  });
}
