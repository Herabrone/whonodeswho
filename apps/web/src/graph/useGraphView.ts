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
import type { Person, RelationshipCategory, XYPosition } from "../types";
import { CATEGORIES, CATEGORY_COLORS, WEAK_RELATIONSHIP_TYPES } from "../constants";
import { useGraphStore } from "../store/useGraphStore";
import { autoLayout, buildAdjacency, getNodesWithinDegrees } from "../lib/graph";
import { buildTimelineRelationshipViews } from "./timelineRelationships";
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
  const timelineOpen = useGraphStore((s) => s.timelineOpen);
  const timelineYear = useGraphStore((s) => s.timelineYear);

  return useMemo<GraphView>(() => {
    const graph = { people, relationships };
    const timelineRelationshipViews = timelineOpen
      ? buildTimelineRelationshipViews(graph, timelineYear)
      : [];
    const timelineViewById = new Map(
      timelineRelationshipViews.map((view) => [view.relationship.id, view]),
    );
    const viewGraph = timelineOpen
      ? {
          people,
          relationships: timelineRelationshipViews.map((view) => view.relationship),
        }
      : graph;
    const peopleById = new Map(people.map((person) => [person.id, person]));
    const relationshipsById = new Map(
      viewGraph.relationships.map((relationship) => [relationship.id, relationship]),
    );
    const adj = buildAdjacency(viewGraph);

    const focusSet =
      focusPersonId !== null
        ? getNodesWithinDegrees(adj, focusPersonId, focusDegrees)
        : null;

    const pathNodeSet = new Set(pathPersonIds);
    const pathEdgeSet = new Set<string>();
    for (let i = 0; i < pathPersonIds.length - 1; i++) {
      const a = pathPersonIds[i];
      const b = pathPersonIds[i + 1];
      const edge = viewGraph.relationships.find(
        (r) =>
          (r.source === a && r.target === b) ||
          (r.source === b && r.target === a),
      );
      if (edge) pathEdgeSet.add(edge.id);
    }

    const treeActive =
      layoutMode === "tree" && treeRootId !== null && people.some((p) => p.id === treeRootId);
    const groupedTreeActive = treeActive && treeShape === "grouped";

    const capitalizeLabel = (s: string | undefined) =>
      !s || s.length === 0
        ? s ?? s
        : s
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

    if (groupedTreeActive && treeRootId) {
      const layout = computeCategoryTree(viewGraph, treeRootId);
      const query = searchQuery.trim().toLowerCase();
      const visibleTimelineNodeIds = new Set<string>([treeRootId]);
      const activeTimelineNodeIds = new Set<string>([treeRootId]);

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
          const timelineView = timelineViewById.get(edge.originalRelationshipId);
          const timelineState = timelineView?.state;
          if (!relationship) return [];

          visibleTimelineNodeIds.add(edge.source);
          visibleTimelineNodeIds.add(edge.target);
          if (timelineState?.activeEpisodes.length) {
            activeTimelineNodeIds.add(edge.source);
            activeTimelineNodeIds.add(edge.target);
          }

          const color = timelineState?.displayColor ?? relationshipColors[edge.category] ?? CATEGORY_COLORS[edge.category];
          const endedLike = timelineState?.visibility === "ended" || timelineState?.visibility === "dormant";
          const style = endedLike
            ? {
                stroke: graphTokens.edge.endedColor,
                strokeWidth: graphTokens.edge.widthEnded,
                opacity: graphTokens.edge.endedOpacity,
                strokeDasharray: graphTokens.edge.endedDash,
              }
            : {
                stroke: color,
                strokeWidth: timelineState?.edgeStyle === "multi"
                  ? graphTokens.edge.widthSelected
                  : graphTokens.edge.width,
                opacity: 1,
              };

          return [{
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: "cat-b",
            targetHandle: "t",
            type: "relationship",
            label: capitalizeLabel(edge.relationshipType),
            data: {
              layoutMode,
              treeShape,
              timelineState,
              relationshipIds: timelineView?.relationshipIds ?? [edge.id],
            },
            style,
            interactionWidth: 24,
            labelStyle: {
              fill: "var(--rf-graph-node-text)",
              fontSize: 11,
              fontWeight: 500,
              opacity: style.opacity ?? 1,
            },
            labelBgStyle: {
              fill: "var(--rf-graph-node-bg)",
              opacity: endedLike ? 0.35 : 0.85,
            },
            labelBgPadding: [4, 2] as [number, number],
            labelBgBorderRadius: 4,
          } satisfies Edge];
        }),
      ];

      for (const node of nodes) {
        if (node.type !== "person" || !timelineOpen) continue;
        const personId = node.data.person.id;
        const treeNodeVisible =
          visibleTimelineNodeIds.has(node.id) || visibleTimelineNodeIds.has(personId);
        const treeNodeActive =
          activeTimelineNodeIds.has(node.id) || activeTimelineNodeIds.has(personId);
        node.data.dimmed = node.data.dimmed || !treeNodeVisible || !treeNodeActive;
      }

      try {
        const nodePos = new Map(nodes.map((node) => [node.id, node.position]));
        const candidates: {
          edgeIndex: number;
          edge: Edge;
          baseX: number;
          baseY: number;
          width: number;
          height: number;
        }[] = [];

        edges.forEach((edge, i) => {
          if (!edge.label || typeof edge.label !== "string") return;
          const src = nodePos.get(edge.source as string);
          const tgt = nodePos.get(edge.target as string);
          if (!src || !tgt) return;
          const baseX = (src.x + tgt.x) / 2;
          const baseY = (src.y + tgt.y) / 2;
          const fontSize = (edge as any).labelStyle?.fontSize ?? 11;
          const [padX = 4, padY = 2] = (edge as any).labelBgPadding ?? [4, 2];
          const charWidth = Math.max(6, fontSize * 0.6);
          const text = String(edge.label);
          const width = Math.max(24, text.length * charWidth) + padX * 2;
          const height = fontSize + padY * 2;
          candidates.push({ edgeIndex: i, edge, baseX, baseY, width, height });
        });

        function rectsIntersect(a: { baseX: number; baseY: number; width: number; height: number }, b: { baseX: number; baseY: number; width: number; height: number }) {
          const ax1 = a.baseX - a.width / 2;
          const ax2 = a.baseX + a.width / 2;
          const ay1 = a.baseY - a.height / 2;
          const ay2 = a.baseY + a.height / 2;
          const bx1 = b.baseX - b.width / 2;
          const bx2 = b.baseX + b.width / 2;
          const by1 = b.baseY - b.height / 2;
          const by2 = b.baseY + b.height / 2;
          return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
        }

        const visited = new Array(candidates.length).fill(false);
        for (let i = 0; i < candidates.length; i++) {
          if (visited[i]) continue;
          const stack = [i];
          const component: number[] = [];
          visited[i] = true;

          while (stack.length > 0) {
            const current = stack.pop()!;
            component.push(current);
            for (let j = 0; j < candidates.length; j++) {
              if (!visited[j] && rectsIntersect(candidates[current], candidates[j])) {
                visited[j] = true;
                stack.push(j);
              }
            }
          }

          if (component.length <= 1) continue;

          component.sort((a, b) => candidates[a].baseY - candidates[b].baseY);
          const maxHeight = Math.max(...component.map((idx) => candidates[idx].height));
          const spacing = Math.max(14, maxHeight + 4);
          for (let k = 0; k < component.length; k++) {
            const candidate = candidates[component[k]];
            const offset = (k - (component.length - 1) / 2) * spacing;
            (candidate.edge.data as Record<string, unknown>) = {
              ...(candidate.edge.data as Record<string, unknown> | undefined),
              labelShiftPx: offset,
            };
            edges[candidate.edgeIndex] = candidate.edge;
          }
        }
      } catch {
        // ignore label collision fallback failures in grouped mode
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

    const treeStructure = treeActive ? buildTreeStructure(viewGraph, treeRootId!) : null;
    const treePositions =
      treeActive && treeRootId && treeShape !== "grouped"
        ? computeTreeLayout(viewGraph, treeRootId, treeShape)
        : null;

    const query = searchQuery.trim().toLowerCase();
    const visible = new Set(visibleCategories);
    const capitalizeLabelGlobal = (s: string | undefined) =>
      !s || s.length === 0
        ? s ?? s
        : s
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    const edges: Edge[] = viewGraph.relationships
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
        const timelineView = timelineViewById.get(r.id);
        const timelineState = timelineView?.state;
        const endedLike = timelineState?.visibility === "ended" || timelineState?.visibility === "dormant";

        const edgeStyle = endedLike
          ? {
              stroke: graphTokens.edge.endedColor,
              strokeWidth: graphTokens.edge.widthEnded,
              opacity: graphTokens.edge.endedOpacity,
              strokeDasharray: graphTokens.edge.endedDash,
            }
          : {
              stroke: timelineState?.displayColor ?? color,
              strokeWidth: timelineState?.edgeStyle === "multi"
                ? Math.max(strokeWidth, graphTokens.edge.widthSelected)
                : strokeWidth,
              opacity,
            };

        return [{
          id: r.id,
          source: r.source,
          target: r.target,
          type: "relationship",
          label: showLabels ? capitalizeLabelGlobal(r.type) : undefined,
          selected: timelineView
            ? timelineView.relationshipIds.includes(selectedRelationshipId ?? "")
            : selectedRelationshipId === r.id,
          data: {
            layoutMode,
            treeShape,
            secondary,
            timelineState,
            relationshipIds: timelineView?.relationshipIds ?? [r.id],
          },
          markerEnd:
            r.direction === "one-way"
              ? { type: MarkerType.ArrowClosed, color: timelineState?.displayColor ?? color }
              : undefined,
          style: edgeStyle,
          interactionWidth: 24,
          labelStyle: {
            fill: "var(--rf-graph-node-text)",
            fontSize: 11,
            fontWeight: 500,
            opacity: endedLike ? 0.2 : dimmed ? 0.2 : 1,
          },
          labelBgStyle: {
            fill: "var(--rf-graph-node-bg)",
            opacity: endedLike ? 0.2 : dimmed ? 0.2 : 0.85,
          },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        }];
      })
      ;

    const presentPersonIds = new Set<string>();
    const activePersonIds = new Set<string>();
    for (const edge of edges) {
      presentPersonIds.add(edge.source);
      presentPersonIds.add(edge.target);
      const timelineState = (edge.data as { timelineState?: { activeEpisodes?: unknown[] } } | undefined)
        ?.timelineState;
      if (timelineState?.activeEpisodes?.length) {
        activePersonIds.add(edge.source);
        activePersonIds.add(edge.target);
      }
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
        (!presentPersonIds.has(person.id) || !activePersonIds.has(person.id));
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

    // Basic label collision avoidance for general layout branch
    try {
      const nodePos = new Map(nodes.map((n) => [n.id, n.position]));
      const candidates: {
        edgeIndex: number;
        edge: Edge;
        baseX: number;
        baseY: number;
        width: number;
        height: number;
      }[] = [];

      edges.forEach((edge, i) => {
        if (!edge.label || typeof edge.label !== "string") return;
        const src = nodePos.get(edge.source as string);
        const tgt = nodePos.get(edge.target as string);
        if (!src || !tgt) return;
        const baseX = (src.x + tgt.x) / 2;
        const baseY = (src.y + tgt.y) / 2;
        const fontSize = (edge as any).labelStyle?.fontSize ?? 11;
        const [padX = 4, padY = 2] = (edge as any).labelBgPadding ?? [4, 2];
        const charWidth = Math.max(6, fontSize * 0.6);
        const text = String(edge.label);
        const width = Math.max(24, text.length * charWidth) + padX * 2;
        const height = fontSize + padY * 2;
        candidates.push({ edgeIndex: i, edge, baseX, baseY, width, height });
      });

      function rectsIntersect(a: any, b: any) {
        const ax1 = a.baseX - a.width / 2;
        const ax2 = a.baseX + a.width / 2;
        const ay1 = a.baseY - a.height / 2;
        const ay2 = a.baseY + a.height / 2;
        const bx1 = b.baseX - b.width / 2;
        const bx2 = b.baseX + b.width / 2;
        const by1 = b.baseY - b.height / 2;
        const by2 = b.baseY + b.height / 2;
        return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
      }

      const n = candidates.length;
      const visited = new Array(n).fill(false);
      for (let i = 0; i < n; i++) {
        if (visited[i]) continue;
        const stack = [i];
        const comp: number[] = [];
        visited[i] = true;
        while (stack.length > 0) {
          const cur = stack.pop()!;
          comp.push(cur);
          for (let j = 0; j < n; j++) {
            if (!visited[j] && rectsIntersect(candidates[cur], candidates[j])) {
              visited[j] = true;
              stack.push(j);
            }
          }
        }

        if (comp.length <= 1) continue;
        comp.sort((a, b) => candidates[a].baseY - candidates[b].baseY);
        const maxHeight = Math.max(...comp.map((idx) => candidates[idx].height));
        const spacing = Math.max(14, maxHeight + 4);
        const count = comp.length;
        for (let k = 0; k < count; k++) {
          const candidate = candidates[comp[k]];
          const offset = (k - (count - 1) / 2) * spacing;
          (candidate.edge.data as any) = {
            ...(candidate.edge.data as any),
            labelShiftPx: offset,
          };
          edges[candidate.edgeIndex] = candidate.edge;
        }
      }
    } catch (e) {
      // ignore
    }

    const radialLabels =
      treeActive && treeRootId && treeShape === "radial" && treeStructure && treePositions
        ? computeRadialCategoryLabels(
            viewGraph,
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
