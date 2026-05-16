/**
 * GraphCanvas — the React Flow surface.
 * Renders nodes/edges derived by useGraphView and reports interactions back to
 * the store (selection, drag position). It is a PURE FUNCTION OF STORE STATE —
 * no track should ever need to edit this file.
 */
import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type NodeChange,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PersonNode } from "./PersonNode";
import { useGraphView, type PersonNode as PersonNodeType } from "./useGraphView";
import { useGraphStore } from "../store/useGraphStore";

const nodeTypes = { person: PersonNode };

export function GraphCanvas() {
  const { nodes, edges } = useGraphView();
  const setPosition = useGraphStore((s) => s.setPosition);
  const selectPerson = useGraphStore((s) => s.selectPerson);
  const selectRelationship = useGraphStore((s) => s.selectRelationship);
  const clearSelection = useGraphStore((s) => s.clearSelection);

  // Commit drag positions straight to the store; the derived nodes react.
  const onNodesChange = useCallback(
    (changes: NodeChange<PersonNodeType>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          setPosition(change.id, change.position);
        }
      }
    },
    [setPosition],
  );

  const onNodeClick = useCallback<NodeMouseHandler<PersonNodeType>>(
    (_, node) => selectPerson(node.id),
    [selectPerson],
  );

  const onEdgeClick = useCallback<EdgeMouseHandler<Edge>>(
    (_, edge) => selectRelationship(edge.id),
    [selectRelationship],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={clearSelection}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
    >
      <Background color="#d8d6cf" gap={28} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor="#c3c1ba" maskColor="rgba(244,243,239,0.7)" />
    </ReactFlow>
  );
}
