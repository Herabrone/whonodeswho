/**
 * useGraphView — derives React Flow `nodes` and `edges` from store state,
 * with all styling (focus dim/highlight, degrees-of-separation path, search
 * match, category filtering) applied.
 *
 * This is the bridge between the store and the canvas. Tracks B and C never
 * touch the canvas — they only write store fields, and this hook reacts.
 */
import { useMemo } from "react";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { Person, RelationshipCategory, XYPosition } from "../types";
import { CATEGORIES, WEAK_RELATIONSHIP_TYPES } from "../constants";
import { useGraphStore } from "../store/useGraphStore";
import { autoLayout, buildAdjacency, getNodesWithinDegrees } from "../lib/graph";
import {
  buildTreeStructure,
  computeRadialCategoryLabels,
  computeTreeLayout,
  isTreePrimaryEdge,
} from "./layout";

export interface PersonNodeData extends Record<string, unknown> {
  person: Person;
  dimmed: boolean;
  highlighted: boolean;
  onPath: boolean;
  searchMatch: boolean;
  selected: boolean;
}

export type PersonNode = Node<PersonNodeData, "person">;

export interface GraphView {
  nodes: PersonNode[];
  edges: Edge[];
  radialLabels: Array<{
    category: RelationshipCategory;
    label: string;
    color: string;
    position: XYPosition;
  }>;
}

export function useGraphView(): GraphView {
  const people = useGraphStore((s) => s.people);
  const relationships = useGraphStore((s) => s.relationships);
  const positions = useGraphStore((s) => s.positions);
  const selectedPersonId = useGraphStore((s) => s.selectedPersonId);
  const selectedRelationshipId = useGraphStore((s) => s.selectedRelationshipId);
  const visibleCategories = useGraphStore((s) => s.visibleCategories);
  const showLabels = useGraphStore((s) => s.showLabels);
  const hideWeak = useGraphStore((s) => s.hideWeak);
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const focusPersonId = useGraphStore((s) => s.focusPersonId);
  const focusDegrees = useGraphStore((s) => s.focusDegrees);
  const pathPersonIds = useGraphStore((s) => s.pathPersonIds);
  const relationshipColors = useGraphStore((s) => s.relationshipColors);
  const layoutMode = useGraphStore((s) => s.layoutMode);
  const treeShape = useGraphStore((s) => s.treeShape);
  const treeRootId = useGraphStore((s) => s.treeRootId);

  return useMemo<GraphView>(() => {
    const graph = { people, relationships };
    const adj = buildAdjacency(graph);

    // Focus set: people within N degrees of the focused person.
    const focusSet =
      focusPersonId !== null
        ? getNodesWithinDegrees(adj, focusPersonId, focusDegrees)
        : null;

    // Degrees-of-separation path sets.
    const pathNodeSet = new Set(pathPersonIds);
    const pathEdgeSet = new Set<string>();
    for (let i = 0; i < pathPersonIds.length - 1; i++) {
      const a = pathPersonIds[i];
      const b = pathPersonIds[i + 1];
      const edge = relationships.find(
        (r) =>
          (r.source === a && r.target === b) ||
          (r.source === b && r.target === a),
      );
      if (edge) pathEdgeSet.add(edge.id);
    }

    const treeActive =
      layoutMode === "tree" && treeRootId !== null && people.some((p) => p.id === treeRootId);

    const treeStructure = treeActive ? buildTreeStructure(graph, treeRootId!) : null;
    const treePositions =
      treeActive && treeRootId
        ? computeTreeLayout(graph, treeRootId, treeShape)
        : null;

    const query = searchQuery.trim().toLowerCase();
    const visible = new Set(visibleCategories);

    const nodes: PersonNode[] = people.map((person, i) => {
      const position =
        treePositions?.[person.id] ??
        positions[person.id] ??
        autoLayout(i, people.length);
      const inFocus = focusSet ? focusSet.has(person.id) : true;
      const onPath = pathNodeSet.has(person.id);
      const searchMatch = query.length > 0 && person.name.toLowerCase().includes(query);
      // A node is dimmed if a focus is active and it's outside the focus set,
      // or a path is active and it's not on the path.
      const dimmed =
        (focusSet !== null && !inFocus) ||
        (pathPersonIds.length > 0 && !onPath);
      return {
        id: person.id,
        type: "person",
        position,
        data: {
          person,
          dimmed,
          highlighted: focusPersonId === person.id,
          onPath,
          searchMatch,
          selected: selectedPersonId === person.id,
        },
      };
    });

    const edges: Edge[] = relationships
      .filter((r) => visible.has(r.category))
      .filter((r) => !(hideWeak && WEAK_RELATIONSHIP_TYPES.has(r.type)))
      .map((r) => {
        const onPath = pathEdgeSet.has(r.id);
        const secondary =
          treeActive && treeStructure
            ? !isTreePrimaryEdge(treeStructure, r.source, r.target)
            : false;
        const dimmed =
          (focusSet !== null &&
            !(focusSet.has(r.source) && focusSet.has(r.target))) ||
          (pathPersonIds.length > 0 && !onPath);
        const color = r.color ?? relationshipColors[r.category];
        const baseOpacity = dimmed ? 0.12 : 1;
        const opacity = secondary && !dimmed ? 0.4 : baseOpacity;
        const strokeWidth = secondary && !onPath ? 1.4 : onPath ? 4 : 2;
        return {
          id: r.id,
          source: r.source,
          target: r.target,
          type: "relationship",
          label: showLabels ? r.type : undefined,
          selected: selectedRelationshipId === r.id,
          data: {
            layoutMode,
            treeShape,
            secondary,
          },
          markerEnd:
            r.direction === "one-way"
              ? { type: MarkerType.ArrowClosed, color }
              : undefined,
          style: {
            stroke: color,
            strokeWidth,
            opacity,
            strokeDasharray: secondary && !onPath ? "6 4" : undefined,
          },
          labelStyle: {
            fill: "#1a1d24",
            fontSize: 11,
            fontWeight: 500,
            opacity: dimmed ? 0.2 : 1,
          },
          labelBgStyle: { fill: "#ffffff", opacity: dimmed ? 0.2 : 0.9 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
      });

    const radialLabels =
      treeActive && treeRootId && treeShape === "radial" && treeStructure && treePositions
        ? computeRadialCategoryLabels(
            graph,
            treeRootId,
            treePositions,
            treeStructure,
            relationshipColors,
          )
        : [];

    const sortedLabels = CATEGORIES.flatMap((category) =>
      radialLabels.filter((label) => label.category === category),
    );

    return { nodes, edges, radialLabels: sortedLabels };
  }, [
    people,
    relationships,
    positions,
    selectedPersonId,
    selectedRelationshipId,
    visibleCategories,
    showLabels,
    hideWeak,
    searchQuery,
    focusPersonId,
    focusDegrees,
    pathPersonIds,
    relationshipColors,
    layoutMode,
    treeShape,
    treeRootId,
  ]);
}
