/**
 * GraphCanvas — the React Flow surface.
 * Renders nodes/edges derived by useGraphView and reports interactions back to
 * the store (selection, drag position). It is a PURE FUNCTION OF STORE STATE —
 * no track should ever need to edit this file.
 */
import { useCallback, useEffect } from "react";
import {
  ViewportPortal,
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PersonNode } from "./PersonNode";
import { useGraphView } from "./useGraphView";
import { useGraphStore } from "../store/useGraphStore";
import { FloatingEdge } from "./FloatingEdge";
import { dispatchOpenRelationshipComposer } from "../features/crud/relationshipComposerEvent";
import { CategoryNode } from "./CategoryNode";

const nodeTypes = { person: PersonNode, category: CategoryNode };
const edgeTypes = { relationship: FloatingEdge };

export function GraphCanvas() {
  const { nodes, edges, radialLabels, groupedDivider } = useGraphView();
  const { fitView } = useReactFlow();
  const setPosition = useGraphStore((s) => s.setPosition);
  const selectPerson = useGraphStore((s) => s.selectPerson);
  const selectRelationship = useGraphStore((s) => s.selectRelationship);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const layoutMode = useGraphStore((s) => s.layoutMode);
  const treeShape = useGraphStore((s) => s.treeShape);
  const treeRootId = useGraphStore((s) => s.treeRootId);
  const setTreeRoot = useGraphStore((s) => s.setTreeRoot);

  // Commit drag positions straight to the store; the derived nodes react.
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          setPosition(change.id, change.position);
        }
      }
    },
    [setPosition],
  );

  const onNodeClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      const personId =
        typeof node.data === "object" && node.data !== null
          ? (node.data as { person?: { id?: string } }).person?.id
          : undefined;

      if (!personId) return;

      selectPerson(personId);
    },
    [selectPerson],
  );

  const onNodeDoubleClick = useCallback<NodeMouseHandler>(
    (event, node) => {
      const personId =
        typeof node.data === "object" && node.data !== null
          ? (node.data as { person?: { id?: string } }).person?.id
          : undefined;
      if (!personId) return;
      if (layoutMode === "tree") {
        event.preventDefault();
        event.stopPropagation();
        setTreeRoot(personId);
        requestAnimationFrame(() => {
          void fitView({ padding: 0.25, duration: 220 });
        });
      }
    },
    [fitView, layoutMode, setTreeRoot],
  );

  const onEdgeClick = useCallback<EdgeMouseHandler<Edge>>(
    (_, edge) => selectRelationship(edge.id),
    [selectRelationship],
  );

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;

    dispatchOpenRelationshipComposer({
      sourceId: connection.source,
      targetId: connection.target,
    });
  }, []);

  useEffect(() => {
    if (layoutMode !== "tree") return;
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.3, duration: 240 });
    });
    return () => cancelAnimationFrame(frame);
  }, [layoutMode, treeShape, treeRootId, nodes.length, edges.length, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onEdgeClick={onEdgeClick}
      onConnect={onConnect}
      onPaneClick={clearSelection}
      nodesDraggable={layoutMode === "free"}
      zoomOnDoubleClick={layoutMode !== "tree"}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
    >
      <Background color="#d8d6cf" gap={28} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor="#c3c1ba" maskColor="rgba(244,243,239,0.7)" />
      <ViewportPortal>
        {layoutMode === "tree" && treeShape === "grouped" && groupedDivider ? (
          <div
            style={{
              position: "absolute",
              transform: `translate(${groupedDivider.x}px, ${groupedDivider.yTop}px)`,
              width: 0,
              height: groupedDivider.yBottom - groupedDivider.yTop,
              borderLeft: "2px solid rgba(134, 142, 150, 0.65)",
              pointerEvents: "none",
            }}
          />
        ) : null}
        {layoutMode === "tree" && treeShape === "radial"
          ? radialLabels.map((item) => (
              <div
                key={item.category}
                style={{
                  position: "absolute",
                  transform: `translate(${item.position.x}px, ${item.position.y}px) translate(-50%, -50%)`,
                  color: item.color,
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  opacity: 0.35,
                  pointerEvents: "none",
                  background: "rgba(255,255,255,0.42)",
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {item.label}
              </div>
            ))
          : null}
      </ViewportPortal>
    </ReactFlow>
  );
}
