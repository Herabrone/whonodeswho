import { CATEGORY_LABELS } from "../constants";
import type { GraphData, RelationshipCategory, XYPosition } from "../types";

const ORDERED_CATEGORIES: RelationshipCategory[] = [
  "family",
  "romantic",
  "friend",
  "work",
  "education",
  "other",
];

// Increased spacing to reduce label overlap in grouped tree view
const LEVEL_GAP = 220;
const NODE_W = 160;
const NODE_H = 44;
const CAT_W = 160;
const CAT_H = 44;
const H_GAP = 40;
const CAT_GROUP_GAP = H_GAP * 4;

interface CategoryConnection {
  personId: string;
  relationshipId: string;
  relationshipType: string;
}

export interface TreeLayout {
  personPositions: Record<string, XYPosition>;
  categoryNodes: Array<{
    id: string;
    category: RelationshipCategory;
    label: string;
    position: XYPosition;
  }>;
  categoryEdges: Array<{
    id: string;
    source: string;
    target: string;
    category: RelationshipCategory;
  }>;
  personEdges: Array<{
    id: string;
    source: string;
    target: string;
    category: RelationshipCategory;
    relationshipType: string;
    originalRelationshipId: string;
    labelRank: number;
    labelCount: number;
  }>;
  disconnectedIds: string[];
}

function categoryNodeId(category: RelationshipCategory): string {
  return `cat-${category}`;
}

function treePersonNodeId(category: RelationshipCategory, personId: string): string {
  return `tree-${category}-${personId}`;
}

function toNodePosition(centerX: number, centerY: number, width: number, height: number): XYPosition {
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
  };
}

export function computeCategoryTree(graph: GraphData, rootId: string): TreeLayout {
  const personPositions: Record<string, XYPosition> = {};
  const categoryNodes: TreeLayout["categoryNodes"] = [];
  const categoryEdges: TreeLayout["categoryEdges"] = [];
  const personEdges: TreeLayout["personEdges"] = [];

  const peopleById = new Map(graph.people.map((person) => [person.id, person]));
  if (!peopleById.has(rootId)) {
    return {
      personPositions,
      categoryNodes,
      categoryEdges,
      personEdges,
      disconnectedIds: graph.people.map((person) => person.id),
    };
  }

  const grouped = new Map<RelationshipCategory, Map<string, CategoryConnection>>();

  for (const relationship of graph.relationships) {
    const touchesRoot = relationship.source === rootId || relationship.target === rootId;
    if (!touchesRoot) continue;

    const personId = relationship.source === rootId ? relationship.target : relationship.source;
    if (!peopleById.has(personId) || personId === rootId) continue;

    const categoryGroup = grouped.get(relationship.category) ?? new Map<string, CategoryConnection>();

    if (!categoryGroup.has(personId)) {
      categoryGroup.set(personId, {
        personId,
        relationshipId: relationship.id,
        relationshipType: relationship.type,
      });
    }

    grouped.set(relationship.category, categoryGroup);
  }

  const activeCategories = ORDERED_CATEGORIES.filter(
    (category) => (grouped.get(category)?.size ?? 0) > 0,
  );

  const subtreeWidths = activeCategories.map((category) => {
    const count = grouped.get(category)?.size ?? 0;
    return count * NODE_W + Math.max(0, count - 1) * H_GAP;
  });

  const totalTreeWidth =
    subtreeWidths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, activeCategories.length - 1) * CAT_GROUP_GAP;

  const leftEdge = -totalTreeWidth / 2;

  const rootCenterX = activeCategories.length > 0 ? 0 : 0;
  const rootCenterY = 0;
  personPositions[rootId] = toNodePosition(rootCenterX, rootCenterY, NODE_W, NODE_H);

  let cursorX = leftEdge;

  for (let index = 0; index < activeCategories.length; index++) {
    const category = activeCategories[index];
    const categoryId = categoryNodeId(category);
    const entries = [...(grouped.get(category)?.values() ?? [])].sort((a, b) => {
      const nameA = peopleById.get(a.personId)?.name ?? a.personId;
      const nameB = peopleById.get(b.personId)?.name ?? b.personId;
      return nameA.localeCompare(nameB);
    });

    const subtreeWidth = subtreeWidths[index];
    const catCenterX = cursorX + subtreeWidth / 2;
    const catCenterY = LEVEL_GAP;

    categoryNodes.push({
      id: categoryId,
      category,
      label: CATEGORY_LABELS[category],
      position: toNodePosition(catCenterX, catCenterY, CAT_W, CAT_H),
    });

    categoryEdges.push({
      id: `tree-edge-root-${category}`,
      source: rootId,
      target: categoryId,
      category,
    });

    const personRowStartX = catCenterX - subtreeWidth / 2;

    entries.forEach((entry, personIndex) => {
      const childCenterX = personRowStartX + NODE_W / 2 + personIndex * (NODE_W + H_GAP);
      const childCenterY = LEVEL_GAP * 2;
      const childNodeId = treePersonNodeId(category, entry.personId);

      personPositions[childNodeId] = toNodePosition(childCenterX, childCenterY, NODE_W, NODE_H);

      personEdges.push({
        id: `tree-edge-${category}-${entry.personId}`,
        source: categoryId,
        target: childNodeId,
        category,
        relationshipType: entry.relationshipType,
        originalRelationshipId: entry.relationshipId,
        labelRank: personIndex,
        labelCount: entries.length,
      });
    });

    cursorX += subtreeWidth + CAT_GROUP_GAP;
  }

  const connectedIds = new Set<string>();
  for (const category of activeCategories) {
    for (const entry of grouped.get(category)?.values() ?? []) {
      connectedIds.add(entry.personId);
    }
  }

  const disconnectedIds = graph.people
    .filter((person) => person.id !== rootId && !connectedIds.has(person.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((person) => person.id);

  const treeRightEdge = Math.max(totalTreeWidth / 2, NODE_W / 2);
  const disconnectedX = treeRightEdge + 60;

  disconnectedIds.forEach((id, index) => {
    personPositions[id] = {
      x: disconnectedX,
      y: LEVEL_GAP + index * (NODE_H + H_GAP),
    };
  });

  return {
    personPositions,
    categoryNodes,
    categoryEdges,
    personEdges,
    disconnectedIds,
  };
}
