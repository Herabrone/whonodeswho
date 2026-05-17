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
import { graphTokens } from "@/design-tokens";
import type { Person, Relationship, RelationshipCategory, XYPosition } from "../types";
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

interface TimelineRelationshipState {
  hidden: boolean;
  ended: boolean;
  opacity?: number;
}

function getTimelineRelationshipState(
  timelineOpen: boolean,
  timelineYear: number,
  relationship?: Pick<Relationship, "startYear" | "endYear" | "isActive">,
): TimelineRelationshipState {
  if (!timelineOpen || relationship?.startYear === undefined) {
    return { hidden: false, ended: false };
  }

  if (timelineYear < relationship.startYear) {
    return { hidden: true, ended: false };
  }

  const ended =
    relationship.isActive === false &&
    relationship.endYear !== undefined &&
    timelineYear >= relationship.endYear;

  if (ended) {
    return { hidden: false, ended: true, opacity: 0.2 };
  }

  return {
    hidden: false,
    ended: false,
    opacity: Math.min(1, (timelineYear - relationship.startYear) / 0.4),
  };
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
  const timelineOpen = useGraphStore((s) => s.timelineOpen);
  const timelineYear = useGraphStore((s) => s.timelineYear);

  return useMemo<GraphView>(() => {
    const graph = { people, relationships };
    const peopleById = new Map(people.map((person) => [person.id, person]));
    const relationshipsById = new Map(
      relationships.map((relationship) => [relationship.id, relationship]),
    );
    const adj = buildAdjacency(graph);

    const focusSet =
      focusPersonId !== null
        ? getNodesWithinDegrees(adj, focusPersonId, focusDegrees)
        : null;

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
      const visibleTimelineNodeIds = new Set<string>([treeRootId]);

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
        ...layout.categoryEdges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: "sb",
          targetHandle: "cat-t",
          type: "relationship",
          data: {
            layoutMode,
            treeShape,
          },
          style: {
            stroke: CATEGORY_COLORS.other,
            strokeWidth: 1.2,
            opacity: 0.7,
          },
        })),
        ...layout.personEdges.flatMap((edge) => {
            const relationship = relationshipsById.get(edge.originalRelationshipId);
            const timelineState = getTimelineRelationshipState(
              timelineOpen,
              timelineYear,
              relationship,
            );
            if (timelineState.hidden) return [];

            visibleTimelineNodeIds.add(edge.source);
            visibleTimelineNodeIds.add(edge.target);

            const color = relationshipColors[edge.category] ?? CATEGORY_COLORS[edge.category];
            const style = timelineState.ended
              ? {
                  stroke: graphTokens.edge.endedColor,
                  strokeWidth: graphTokens.edge.widthEnded,
                  opacity: timelineState.opacity ?? graphTokens.edge.endedOpacity,
                  strokeDasharray: graphTokens.edge.endedDash,
                }
              : {
                  stroke: color,
                  strokeWidth: graphTokens.edge.width,
                  opacity: timelineState.opacity ?? 1,
                };

            return [{
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: "cat-b",
              targetHandle: "t",
              type: "relationship",
              label: edge.relationshipType,
              data: {
                layoutMode,
                treeShape,
              },
              style,
              labelStyle: {
                fill: "var(--rf-graph-node-text)",
                fontSize: 11,
                fontWeight: 500,
                opacity: style.opacity ?? 1,
              },
              labelBgStyle: {
                fill: "var(--rf-graph-node-bg)",
                opacity: timelineState.ended ? 0.35 : 0.85,
              },
              labelBgPadding: [4, 2] as [number, number],
              labelBgBorderRadius: 4,
            } satisfies Edge];
          })
          ,
      ];

      for (const node of nodes) {
        if (node.type !== "person" || !timelineOpen) continue;
        const personId = node.data.person.id;
        const treeNodeVisible =
          visibleTimelineNodeIds.has(node.id) || visibleTimelineNodeIds.has(personId);
        node.data.dimmed = node.data.dimmed || !treeNodeVisible;
      }

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

    const edges: Edge[] = relationships
      .filter((r) => visible.has(r.category))
      .filter((r) => !(hideWeak && WEAK_RELATIONSHIP_TYPES.has(r.type)))
      .flatMap((r) => {
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
        const timelineState = getTimelineRelationshipState(
          timelineOpen,
          timelineYear,
          r,
        );
        if (timelineState.hidden) return [];

        const edgeStyle = timelineState.ended
          ? {
              stroke: graphTokens.edge.endedColor,
              strokeWidth: graphTokens.edge.widthEnded,
              opacity: graphTokens.edge.endedOpacity,
              strokeDasharray: graphTokens.edge.endedDash,
            }
          : {
              stroke: color,
              strokeWidth,
              opacity:
                timelineState.opacity !== undefined
                  ? opacity * timelineState.opacity
                  : opacity,
            };

        return [{
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
          style: edgeStyle,
          labelStyle: {
            fill: "var(--rf-graph-node-text)",
            fontSize: 11,
            fontWeight: 500,
            opacity: timelineState.ended ? 0.2 : dimmed ? 0.2 : 1,
          },
          labelBgStyle: {
            fill: "var(--rf-graph-node-bg)",
            opacity: timelineState.ended ? 0.2 : dimmed ? 0.2 : 0.85,
          },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        }];
      })
      ;

    const presentPersonIds = new Set<string>();
    for (const edge of edges) {
      presentPersonIds.add(edge.source);
      presentPersonIds.add(edge.target);
    }

    const nodes: Array<PersonNode | CategoryNode> = people.map((person, i) => {
      const position =
        treePositions?.[person.id] ??
        positions[person.id] ??
        autoLayout(i, people.length);
      const inFocus = focusSet ? focusSet.has(person.id) : true;
      const onPath = pathNodeSet.has(person.id);
      const searchMatch = query.length > 0 && person.name.toLowerCase().includes(query);
      const timelineDimmed =
        timelineOpen &&
        relationships.some(
          (relationship) =>
            relationship.source === person.id || relationship.target === person.id,
        ) &&
        !presentPersonIds.has(person.id);
      const dimmed =
        (focusSet !== null && !inFocus) ||
        (pathPersonIds.length > 0 && !onPath) ||
        timelineDimmed;
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
    timelineOpen,
    timelineYear,
  ]);
}
