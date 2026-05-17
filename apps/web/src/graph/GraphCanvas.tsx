/**
 * GraphCanvas — the React Flow surface.
 * Renders nodes/edges derived by useGraphView and reports interactions back to
 * the store (selection, drag position). It is a PURE FUNCTION OF STORE STATE —
 * no track should ever need to edit this file.
 */
import { useCallback, useEffect, useState, useRef } from "react";
import {
  ViewportPortal,
  ReactFlow,
  Background,
  Controls,
  Panel,
  useReactFlow,
  useViewport,
  useStore,
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
import { CATEGORY_COLORS } from "../constants";

const nodeTypes = { person: PersonNode, category: CategoryNode };
const edgeTypes = { relationship: FloatingEdge };

// ─── Custom Canvas MiniMap ─────────────────────────────────────────────────────
// Draws nodes (colored), edges (colored), and a live viewport overlay rectangle.
// Uses node.position directly from useGraphView so there are no NaN issues.
function CanvasMiniMap({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Live viewport from ReactFlow (re-renders on pan/zoom)
  const { x: vpX, y: vpY, zoom: vpZoom } = useViewport();
  // ReactFlow container dimensions from the internal store
  const rfW = useStore((s: any) => s.width as number);
  const rfH = useStore((s: any) => s.height as number);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = wrap.clientWidth || 148;
    const H = wrap.clientHeight || 120;
    if (W === 0 || H === 0) return;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(DPR, DPR);

    // Draw background
    ctx.fillStyle = "#f8f7f4";
    ctx.fillRect(0, 0, W, H);

    if (!nodes || nodes.length === 0) {
      ctx.restore();
      return;
    }

    // Build node rects using .position (always finite from our store)
    const rects = nodes.map((n) => {
      const w = (n.measured?.width ?? n.width ?? 96) as number;
      const h = (n.measured?.height ?? n.height ?? 48) as number;
      const x = (n.position?.x as number) ?? 0;
      const y = (n.position?.y as number) ?? 0;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        id: n.id as string,
        cx: x + w / 2,
        cy: y + h / 2,
        color:
          (n.data?.person?.color as string | undefined) ??
          (n.data?.category
            ? (CATEGORY_COLORS[n.data.category as keyof typeof CATEGORY_COLORS] ?? "#c3c1ba")
            : "#c3c1ba"),
      };
    }).filter(Boolean) as { id: string; cx: number; cy: number; color: string }[];

    if (rects.length === 0) { ctx.restore(); return; }

    const xs = rects.map((r) => r.cx);
    const ys = rects.map((r) => r.cy);
    const PAD = 10;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);

    // Center the scaled content within the canvas
    const offsetX = (W - spanX * scale) / 2;
    const offsetY = (H - spanY * scale) / 2;

    const toMX = (gx: number) => offsetX + (gx - minX) * scale;
    const toMY = (gy: number) => offsetY + (gy - minY) * scale;

    // Draw viewport fill FIRST (under nodes/edges) so nodes remain visible
    if (vpZoom > 0 && Number.isFinite(vpX) && Number.isFinite(vpY)) {
      const cW = rfW || 800;
      const cH = rfH || 600;
      const gx1 = -vpX / vpZoom;
      const gy1 = -vpY / vpZoom;
      const gx2 = (cW - vpX) / vpZoom;
      const gy2 = (cH - vpY) / vpZoom;
      const mx1 = toMX(gx1);
      const my1 = toMY(gy1);
      const mw = (gx2 - gx1) * scale;
      const mh = (gy2 - gy1) * scale;
      ctx.save();
      ctx.fillStyle = "rgba(59,130,246,0.12)";
      ctx.fillRect(mx1, my1, mw, mh);
      ctx.restore();
    }

    // Draw edges
    if (edges) {
      for (const e of edges) {
        const s = rects.find((r) => r.id === e.source);
        const t = rects.find((r) => r.id === e.target);
        if (!s || !t) continue;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = (e.style?.stroke as string) ?? "rgba(0,0,0,0.18)";
        ctx.globalAlpha = Math.max(0.15, (e.style?.opacity as number) ?? 1) * 0.85;
        ctx.lineWidth = 1.2;
        ctx.moveTo(toMX(s.cx), toMY(s.cy));
        ctx.lineTo(toMX(t.cx), toMY(t.cy));
        ctx.stroke();
        ctx.restore();
      }
    }

    // Draw nodes (on top of edges and viewport fill)
    for (const r of rects) {
      ctx.beginPath();
      ctx.fillStyle = r.color;
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      ctx.arc(toMX(r.cx), toMY(r.cy), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Draw viewport border LAST (over everything)
    if (vpZoom > 0 && Number.isFinite(vpX) && Number.isFinite(vpY)) {
      const cW = rfW || 800;
      const cH = rfH || 600;
      const gx1 = -vpX / vpZoom;
      const gy1 = -vpY / vpZoom;
      const gx2 = (cW - vpX) / vpZoom;
      const gy2 = (cH - vpY) / vpZoom;
      const mx1 = toMX(gx1);
      const my1 = toMY(gy1);
      const mw = (gx2 - gx1) * scale;
      const mh = (gy2 - gy1) * scale;
      ctx.save();
      ctx.strokeStyle = "rgba(59,130,246,0.85)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mx1, my1, mw, mh);
      ctx.restore();
    }

    ctx.restore();
  }, [nodes, edges, vpX, vpY, vpZoom, rfW, rfH]);

  useEffect(() => { draw(); }, [draw]);

  // Redraw when container resizes (e.g. panel slide open/close)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const obs = new ResizeObserver(() => draw());
    obs.observe(wrap);
    return () => obs.disconnect();
  }, [draw]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

function MinimapContainer({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const [isCollapsed, setCollapsed] = useState(false);
  const PANEL_W = 180;
  const PANEL_H = 120;
  const TAB_W = 32;

  // <Panel> renders OUTSIDE ReactFlow's viewport transform — correct screen-space positioning.
  return (
    <Panel
      position="bottom-right"
      style={{ margin: 0, padding: 0, display: "flex", alignItems: "flex-end", gap: 0, background: "transparent", border: "none", boxShadow: "none" }}
    >
      {/* Pull-tab on left edge of panel */}
      <button
        aria-label="Toggle minimap"
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: TAB_W,
          height: TAB_W,
          flexShrink: 0,
          alignSelf: "flex-end",
          marginBottom: (PANEL_H - TAB_W) / 2,
          borderRadius: isCollapsed ? "0 8px 8px 0" : "8px 0 0 8px",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRight: "none",
          background: "rgba(255,255,255,0.95)",
          boxShadow: "-2px 2px 8px rgba(0,0,0,0.08)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          zIndex: 1,
          transform: isCollapsed ? `translateX(${PANEL_W}px)` : "translateX(0)",
          transition: "transform 300ms ease",
        }}
      >
        {isCollapsed ? "\u25C0" : "\u25B6"}
      </button>

      {/* Minimap panel with slide animation */}
      <div
        style={{
          width: PANEL_W,
          height: PANEL_H,
          overflow: "hidden",
          borderRadius: 8,
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.08)",
          background: "#f8f7f4",
          transform: isCollapsed ? `translateX(${PANEL_W}px)` : "translateX(0)",
          transition: "transform 300ms ease",
          flexShrink: 0,
        }}
      >
        <CanvasMiniMap nodes={nodes} edges={edges} />
      </div>
    </Panel>
  );
}

export function GraphCanvas() {
  const { nodes, edges, radialLabels, groupedDivider } = useGraphView();
  const { fitView } = useReactFlow();
  const setPosition = useGraphStore((s) => s.setPosition);
  const selectPerson = useGraphStore((s) => s.selectPerson);
  const selectRelationship = useGraphStore((s) => s.selectRelationship);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setFocus = useGraphStore((s) => s.setFocus);
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
        return;
      }
      setFocus(personId);
    },
    [fitView, layoutMode, setFocus, setTreeRoot],
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

      {/* Collapsible MiniMap (bottom-right). Shows live miniature preview of the graph. */}
      <MinimapContainer nodes={nodes} edges={edges} />
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
