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
import type { Person } from "../types";
import { CATEGORY_COLORS, WEAK_RELATIONSHIP_TYPES, relationshipColor } from "../constants";
import { useGraphStore } from "../store/useGraphStore";
import { autoLayout, buildAdjacency, getNodesWithinDegrees } from "../lib/graph";

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

    const query = searchQuery.trim().toLowerCase();
    const visible = new Set(visibleCategories);

    const nodes: PersonNode[] = people.map((person, i) => {
      const position =
        positions[person.id] ?? autoLayout(i, people.length);
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
        const dimmed =
          (focusSet !== null &&
            !(focusSet.has(r.source) && focusSet.has(r.target))) ||
          (pathPersonIds.length > 0 && !onPath);
        const color = relationshipColor(r.category, r.color);
        return {
          id: r.id,
          source: r.source,
          target: r.target,
          label: showLabels ? r.type : undefined,
          selected: selectedRelationshipId === r.id,
          markerEnd:
            r.direction === "one-way"
              ? { type: MarkerType.ArrowClosed, color }
              : undefined,
          style: {
            stroke: color,
            strokeWidth: onPath ? 4 : 2,
            opacity: dimmed ? 0.12 : 1,
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

    return { nodes, edges };
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
  ]);
}

/** Re-exported for nodes that want category color directly. */
export { CATEGORY_COLORS };
