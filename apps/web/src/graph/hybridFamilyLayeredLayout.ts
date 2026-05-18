import type { GraphData, Person, Relationship, XYPosition } from "../types";
import { isFamilyRelationship } from "../domain/family/familyRelationshipTypes";
import {
  buildFamilyGenerationLayout,
  type FamilyGenerationLayoutResult,
} from "./familyGenerationLayout";
import { buildTreeStructure, isTreePrimaryEdge, type TreeEdgeRole, type TreeStructure } from "./layout";

const FAMILY_LAYER_Y_SPACING = 180;
const FAMILY_NODE_X_SPACING = 220;
const FAMILY_CLUSTER_PADDING = 320;
const NON_FAMILY_BRANCH_Y_SPACING = 160;
const NON_FAMILY_BRANCH_X_SPACING = 200;

type AdjacencyMap = Map<string, Set<string>>;

export interface HybridFamilyLayeredLayoutResult {
  positions: Record<string, XYPosition>;
  edgeRoleById: Map<string, TreeEdgeRole>;
  familyLayout: FamilyGenerationLayoutResult;
  treeStructure: TreeStructure;
}

function ensureSet(map: AdjacencyMap, key: string): Set<string> {
  const existing = map.get(key);
  if (existing) return existing;
  const created = new Set<string>();
  map.set(key, created);
  return created;
}

function addAdjacency(map: AdjacencyMap, from: string, to: string): void {
  ensureSet(map, from).add(to);
}

function buildNameLookup(people: Person[]): Map<string, Person> {
  return new Map(people.map((person) => [person.id, person]));
}

function comparePeople(peopleById: Map<string, Person>, a: string, b: string): number {
  const nameA = peopleById.get(a)?.name ?? a;
  const nameB = peopleById.get(b)?.name ?? b;
  return nameA.localeCompare(nameB);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function centeredRowX(ids: string[], centerX: number, spacing: number): Map<string, number> {
  const placements = new Map<string, number>();
  if (ids.length === 0) return placements;

  const startX = centerX - ((ids.length - 1) * spacing) / 2;
  ids.forEach((personId, index) => {
    placements.set(personId, startX + index * spacing);
  });
  return placements;
}

function anchoredRowX(
  ids: string[],
  spacing: number,
  anchors: Map<string, number>,
  peopleById: Map<string, Person>,
): Map<string, number> {
  const placements = new Map<string, number>();
  if (ids.length === 0) return placements;

  const ordered = [...ids].sort((left, right) => {
    const anchorOrder = (anchors.get(left) ?? 0) - (anchors.get(right) ?? 0);
    if (Math.abs(anchorOrder) > 0.001) return anchorOrder;
    return comparePeople(peopleById, left, right);
  });
  const centerX = average(ordered.map((personId) => anchors.get(personId) ?? 0));
  return centeredRowX(ordered, centerX, spacing);
}

function buildParentMaps(relationships: Relationship[]): {
  parentsOf: AdjacencyMap;
  childrenOf: AdjacencyMap;
} {
  const parentsOf = new Map<string, Set<string>>();
  const childrenOf = new Map<string, Set<string>>();

  for (const relationship of relationships) {
    const type = relationship.type.trim().toLowerCase();

    if (type === "parent" || type === "mother" || type === "father") {
      addAdjacency(parentsOf, relationship.target, relationship.source);
      addAdjacency(childrenOf, relationship.source, relationship.target);
      continue;
    }

    if (type === "child" || type === "son" || type === "daughter") {
      addAdjacency(parentsOf, relationship.source, relationship.target);
      addAdjacency(childrenOf, relationship.target, relationship.source);
    }
  }

  return { parentsOf, childrenOf };
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

export function computeHybridFamilyLayeredLayout(
  graph: GraphData,
  rootId: string,
  familyLayout = buildFamilyGenerationLayout(graph.people, graph.relationships, rootId),
): HybridFamilyLayeredLayoutResult {
  const peopleById = buildNameLookup(graph.people);
  const positions: Record<string, XYPosition> = {};
  const treeStructure = buildTreeStructure(graph, rootId);
  const { parentsOf, childrenOf } = buildParentMaps(graph.relationships);

  const rootGenerationIds = [...familyLayout.generationByPersonId.entries()]
    .filter(([, generation]) => generation === 0)
    .map(([personId]) => personId);
  const siblingIds = rootGenerationIds
    .filter((personId) => familyLayout.roleByPersonId.get(personId) === "sibling")
    .sort((a, b) => comparePeople(peopleById, a, b));
  const spouseIds = rootGenerationIds
    .filter((personId) => familyLayout.roleByPersonId.get(personId) === "spouse")
    .sort((a, b) => comparePeople(peopleById, a, b));
  const parentIds = [...familyLayout.generationByPersonId.entries()]
    .filter(([, generation]) => generation === 1)
    .map(([personId]) => personId)
    .sort((a, b) => comparePeople(peopleById, a, b));
  const childIds = [...familyLayout.generationByPersonId.entries()]
    .filter(([, generation]) => generation === -1)
    .map(([personId]) => personId)
    .sort((a, b) => comparePeople(peopleById, a, b));
  const grandparentIds = [...familyLayout.generationByPersonId.entries()]
    .filter(([, generation]) => generation === 2)
    .map(([personId]) => personId);
  const grandchildIds = [...familyLayout.generationByPersonId.entries()]
    .filter(([, generation]) => generation === -2)
    .map(([personId]) => personId);

  positions[rootId] = { x: 0, y: 0 };

  siblingIds.forEach((personId, index) => {
    positions[personId] = {
      x: -FAMILY_NODE_X_SPACING * (siblingIds.length - index),
      y: 0,
    };
  });

  spouseIds.forEach((personId, index) => {
    positions[personId] = {
      x: FAMILY_NODE_X_SPACING * (index + 1),
      y: 0,
    };
  });

  const rootClusterCenterX = average([rootId, ...spouseIds].map((personId) => positions[personId]?.x ?? 0));

  const parentRow = centeredRowX(parentIds, rootClusterCenterX, FAMILY_NODE_X_SPACING);
  for (const [personId, x] of parentRow) {
    positions[personId] = { x, y: -FAMILY_LAYER_Y_SPACING };
  }

  const childRow = centeredRowX(childIds, rootClusterCenterX, FAMILY_NODE_X_SPACING);
  for (const [personId, x] of childRow) {
    positions[personId] = { x, y: FAMILY_LAYER_Y_SPACING };
  }

  const grandparentAnchors = new Map<string, number>();
  for (const grandparentId of grandparentIds) {
    const descendants = [...(childrenOf.get(grandparentId) ?? [])].filter((personId) => parentIds.includes(personId));
    if (descendants.length > 0) {
      grandparentAnchors.set(
        grandparentId,
        average(descendants.map((personId) => positions[personId]?.x ?? 0)),
      );
    }
  }
  const grandparentRow = anchoredRowX(grandparentIds, FAMILY_NODE_X_SPACING, grandparentAnchors, peopleById);
  for (const [personId, x] of grandparentRow) {
    positions[personId] = { x, y: -FAMILY_LAYER_Y_SPACING * 2 };
  }

  const grandchildAnchors = new Map<string, number>();
  for (const grandchildId of grandchildIds) {
    const ancestors = [...(parentsOf.get(grandchildId) ?? [])].filter((personId) => childIds.includes(personId));
    if (ancestors.length > 0) {
      grandchildAnchors.set(
        grandchildId,
        average(ancestors.map((personId) => positions[personId]?.x ?? 0)),
      );
    }
  }
  const grandchildRow = anchoredRowX(grandchildIds, FAMILY_NODE_X_SPACING, grandchildAnchors, peopleById);
  for (const [personId, x] of grandchildRow) {
    positions[personId] = { x, y: FAMILY_LAYER_Y_SPACING * 2 };
  }

  const semanticPositions = Object.entries(positions)
    .filter(([personId]) => familyLayout.semanticFamilyPersonIds.has(personId))
    .map(([, point]) => point);
  const maxSemanticX = semanticPositions.reduce((acc, point) => Math.max(acc, point.x), 0);
  const branchStartX = maxSemanticX + FAMILY_CLUSTER_PADDING;

  const remainingIds = new Set<string>(
    [...treeStructure.reachable].filter((personId) => !familyLayout.semanticFamilyPersonIds.has(personId)),
  );

  const placeRemainingChildren = (parentId: string): void => {
    const parentPosition = positions[parentId];
    if (!parentPosition) return;

    const children = (treeStructure.childrenById[parentId] ?? []).filter((personId) => remainingIds.has(personId));
    if (children.length === 0) return;

    const baseX = Math.max(branchStartX, parentPosition.x + NON_FAMILY_BRANCH_X_SPACING);
    const startY = parentPosition.y - ((children.length - 1) * NON_FAMILY_BRANCH_Y_SPACING) / 2;

    children.forEach((childId, index) => {
      positions[childId] = {
        x: baseX,
        y: startY + index * NON_FAMILY_BRANCH_Y_SPACING,
      };
      remainingIds.delete(childId);
      placeRemainingChildren(childId);
    });
  };

  const placedSemanticIds = [...familyLayout.semanticFamilyPersonIds].sort((left, right) => {
    const leftPos = positions[left];
    const rightPos = positions[right];
    const yOrder = (leftPos?.y ?? 0) - (rightPos?.y ?? 0);
    if (Math.abs(yOrder) > 0.001) return yOrder;
    return (leftPos?.x ?? 0) - (rightPos?.x ?? 0);
  });

  for (const personId of placedSemanticIds) {
    placeRemainingChildren(personId);
  }

  if (remainingIds.has(rootId)) {
    remainingIds.delete(rootId);
  }
  if (remainingIds.size > 0) {
    placeRemainingChildren(rootId);
  }

  parkDisconnected(graph, positions, treeStructure.reachable);

  const edgeRoleById = new Map<string, TreeEdgeRole>();
  for (const relationship of graph.relationships) {
    if (familyLayout.primaryFamilyEdgeIds.has(relationship.id)) {
      edgeRoleById.set(relationship.id, "family-primary");
      continue;
    }

    if (familyLayout.secondaryFamilyEdgeIds.has(relationship.id)) {
      edgeRoleById.set(relationship.id, "family-secondary");
      continue;
    }

    if (isTreePrimaryEdge(treeStructure, relationship.source, relationship.target)) {
      edgeRoleById.set(relationship.id, "bfs-primary");
      continue;
    }

    edgeRoleById.set(
      relationship.id,
      isFamilyRelationship(relationship) ? "family-secondary" : "secondary",
    );
  }

  return {
    positions,
    edgeRoleById,
    familyLayout,
    treeStructure,
  };
}