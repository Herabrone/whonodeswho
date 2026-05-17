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
import { CATEGORIES, CATEGORY_COLORS, WEAK_RELATIONSHIP_TYPES } from "../constants";
import { useGraphStore } from "../store/useGraphStore";
import { autoLayout, buildAdjacency, getNodesWithinDegrees } from "../lib/graph";
import {
  buildTreeStructure,
  computeRadialCategoryLabels,
  computeTreeLayout,
  isTreePrimaryEdge,
} from "./layout";
import { computeCategoryTree } from "./treeLayout";
import type { CategoryNodeData } from "./CategoryNode";

export interface PersonNodeData extends Record<string, unknown> {
  person: Person;
  dimmed: boolean;
  highlighted: boolean;
  onPath: boolean;
  searchMatch: boolean;
  selected: boolean;
}

export type PersonNode = Node<PersonNodeData, "person">;
export type CategoryNode = Node<CategoryNodeData, "category">;

export interface GraphView {
  nodes: Array<PersonNode | CategoryNode>;
  edges: Edge[];
  radialLabels: Array<{
    category: RelationshipCategory;
    label: string;
    color: string;
    position: XYPosition;
  }>;
  groupedDivider: { x: number; yTop: number; yBottom: number } | null;
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
    const peopleById = new Map(people.map((person) => [person.id, person]));
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
    const groupedTreeActive = treeActive && treeShape === "grouped";

    if (groupedTreeActive && treeRootId) {
      const layout = computeCategoryTree(graph, treeRootId);
      const query = searchQuery.trim().toLowerCase();

      const nodes: Array<PersonNode | CategoryNode> = [];
      const root = peopleById.get(treeRootId);

      if (root) {
        nodes.push({
          id: root.id,
          type: "person",
          position: layout.personPositions[root.id] ?? positions[root.id] ?? autoLayout(0, people.length),
          data: {
            person: root,
            dimmed: false,
            highlighted: focusPersonId === root.id,
            onPath: false,
            searchMatch: query.length > 0 && root.name.toLowerCase().includes(query),
            selected: selectedPersonId === root.id,
          },
        });
      }

      for (const categoryNode of layout.categoryNodes) {
        nodes.push({
          id: categoryNode.id,
          type: "category",
          position: categoryNode.position,
          data: {
            category: categoryNode.category,
            label: categoryNode.label,
          },
          draggable: false,
          selectable: false,
        });
      }

      const connectedNodeIds = new Set<string>([treeRootId]);

      for (const edge of layout.personEdges) {
        const prefix = `tree-${edge.category}-`;
        const personId = edge.target.startsWith(prefix)
          ? edge.target.slice(prefix.length)
          : edge.target;
        const person = peopleById.get(personId);
        if (!person) continue;
        if (connectedNodeIds.has(edge.target)) continue;

        connectedNodeIds.add(edge.target);

        nodes.push({
          id: edge.target,
          type: "person",
          position: layout.personPositions[edge.target],
          data: {
            person,
            dimmed: false,
            highlighted: false,
            onPath: false,
            searchMatch: query.length > 0 && person.name.toLowerCase().includes(query),
            selected: selectedPersonId === person.id,
          },
        });
      }

      for (const personId of layout.disconnectedIds) {
        const person = peopleById.get(personId);
        if (!person) continue;

        nodes.push({
          id: person.id,
          type: "person",
          position:
            layout.personPositions[person.id] ?? positions[person.id] ?? autoLayout(0, people.length),
          data: {
            person,
            dimmed: true,
            highlighted: false,
            onPath: false,
            searchMatch: query.length > 0 && person.name.toLowerCase().includes(query),
            selected: selectedPersonId === person.id,
          },
        });
      }

      const edges: Edge[] = [
        ...layout.categoryEdges.map((edge) => {
          const color = CATEGORY_COLORS[edge.category];
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: "relationship",
            data: {
              layoutMode,
              treeShape,
            },
            style: {
              stroke: color,
              strokeWidth: 1.5,
              opacity: 0.4,
            },
          } satisfies Edge;
        }),
        ...layout.personEdges.map((edge) => {
          const color = CATEGORY_COLORS[edge.category];
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: "relationship",
            label: edge.relationshipType,
            data: {
              layoutMode,
              treeShape,
            },
            style: {
              stroke: color,
              strokeWidth: 1.5,
              opacity: 1,
            },
            labelStyle: {
              fill: "#1a1d24",
              fontSize: 11,
              fontWeight: 500,
              opacity: 1,
            },
            labelBgStyle: { fill: "#ffffff", opacity: 0.9 },
            labelBgPadding: [4, 2] as [number, number],
            labelBgBorderRadius: 4,
          } satisfies Edge;
        }),
      ];

      let groupedDivider: GraphView["groupedDivider"] = null;
      if (layout.disconnectedIds.length > 0) {
        const xValues = layout.disconnectedIds
          .map((id) => layout.personPositions[id]?.x)
          .filter((x): x is number => typeof x === "number");
        const yValues = layout.disconnectedIds
          .map((id) => layout.personPositions[id]?.y)
          .filter((y): y is number => typeof y === "number");

        if (xValues.length > 0 && yValues.length > 0) {
          const minX = Math.min(...xValues);
          const minY = Math.min(...yValues);
          const maxY = Math.max(...yValues);
          groupedDivider = {
            x: minX - 24,
            yTop: minY - 18,
            yBottom: maxY + 54,
          };
        }
      }

      return {
        nodes,
        edges,
        radialLabels: [],
        groupedDivider,
      };
    }

    const treeStructure = treeActive ? buildTreeStructure(graph, treeRootId!) : null;
    const treePositions =
      treeActive && treeRootId && treeShape !== "grouped"
        ? computeTreeLayout(graph, treeRootId, treeShape)
        : null;

    const query = searchQuery.trim().toLowerCase();
    const visible = new Set(visibleCategories);

    const nodes: Array<PersonNode | CategoryNode> = people.map((person, i) => {
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

    return { nodes, edges, radialLabels: sortedLabels, groupedDivider: null };
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
