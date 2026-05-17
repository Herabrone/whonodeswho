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
  SelectionMode,
  useReactFlow,
  useViewport,
  useStore,
  type Connection,
  type Edge,
  type NodeChange,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import { Hand, MousePointer } from "lucide-react";
import "@xyflow/react/dist/style.css";
import { PersonNode } from "./PersonNode";
import { useGraphView } from "./useGraphView";
import { useGraphStore } from "../store/useGraphStore";
import { FloatingEdge } from "./FloatingEdge";
import {
  dispatchOpenRelationshipComposer,
  dispatchOpenQuickAddRelationships,
} from "../features/crud/relationshipComposerEvent";
import { dispatchOpenPathModal } from "../features/intelligence/pathEvent";
import { CategoryNode } from "./CategoryNode";
import { CATEGORY_COLORS } from "../constants";
import { capitalizeWords } from "../lib/string";

const nodeTypes = { person: PersonNode, category: CategoryNode };
const edgeTypes = { relationship: FloatingEdge };

// ─── Person Context Menu ───────────────────────────────────────────────────────
function ContextMenu({
  id,
  top,
  left,
  right,
  bottom,
  onClose,
}: {
  id: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  onClose: () => void;
}) {
  const person = useGraphStore((s) => s.people.find((p) => p.id === id));
  const deletePerson = useGraphStore((s) => s.deletePerson);
  const setFocus = useGraphStore((s) => s.setFocus);
  const setTreeRoot = useGraphStore((s) => s.setTreeRoot);
  const updatePerson = useGraphStore((s) => s.updatePerson);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(person?.name ?? "");

  if (!person) return null;

  const handleAction = (fn: () => void) => {
    fn();
    onClose();
  };

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== person.name) {
      updatePerson(id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      style={{ top, left, right, bottom }}
      className="absolute z-50 min-w-[160px] overflow-hidden rounded-xl border border-rf-border bg-rf-surface/95 p-1 shadow-2xl backdrop-blur-md"
      onMouseLeave={onClose}
    >
      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-rf-muted">
        {person.name}
      </div>

      <div className="space-y-0.5">
        {isEditing ? (
          <div className="px-2 py-1">
            <input
              autoFocus
              className="w-full rounded border border-rf-border bg-rf-subtle px-2 py-1 text-sm text-rf-text outline-none focus:border-rf-primary"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setIsEditing(false);
              }}
              onBlur={handleRename}
            />
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-rf-text hover:bg-rf-subtle"
          >
            Rename
          </button>
        )}

        <button
          onClick={() => handleAction(() => setFocus(id))}
          className="flex w-full items-center px-3 py-2 text-left text-sm text-rf-text hover:bg-rf-subtle"
        >
          Focus on {capitalizeWords(person.name)}
        </button>

        <button
          onClick={() => handleAction(() => setTreeRoot(id))}
          className="flex w-full items-center px-3 py-2 text-left text-sm text-rf-text hover:bg-rf-subtle"
        >
          Set as Tree Root
        </button>

        <button
          onClick={() => handleAction(() => dispatchOpenQuickAddRelationships({ personId: id }))}
          className="flex w-full items-center px-3 py-2 text-left text-sm text-rf-text hover:bg-rf-subtle"
        >
          Add Relationships...
        </button>

        <button
          onClick={() => handleAction(() => dispatchOpenPathModal())}
          className="flex w-full items-center px-3 py-2 text-left text-sm text-rf-text hover:bg-rf-subtle"
        >
          Find Path to...
        </button>

        <div className="my-1 border-t border-rf-border" />

        <button
          onClick={() => handleAction(() => deletePerson(id))}
          className="flex w-full items-center px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
        >
          Delete Person
        </button>
      </div>
    </div>
  );
}

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
          borderRadius: "8px 0 0 8px",
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
  const { fitView, getNodes } = useReactFlow();
  const [cursorMode, setCursorMode] = useState<"pan" | "select">("pan");
  const setPosition = useGraphStore((s) => s.setPosition);
  const selectPerson = useGraphStore((s) => s.selectPerson);
  const selectRelationship = useGraphStore((s) => s.selectRelationship);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setFocus = useGraphStore((s) => s.setFocus);
  const layoutMode = useGraphStore((s) => s.layoutMode);
  const treeShape = useGraphStore((s) => s.treeShape);
  const treeRootId = useGraphStore((s) => s.treeRootId);
  const setTreeRoot = useGraphStore((s) => s.setTreeRoot);
  const [menu, setMenu] = useState<{
    id: string;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  } | null>(null);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();

      const personId =
        typeof node.data === "object" && node.data !== null
          ? (node.data as { person?: { id?: string } }).person?.id
          : undefined;

      if (!personId) return;

      const pane = document.querySelector(".react-flow__pane")?.getBoundingClientRect();
      if (!pane) return;

      // Position logic: keep inside pane boundaries
      const PANE_W = pane.width;
      const PANE_H = pane.height;
      const MENU_W = 180;
      const MENU_H = 260;

      let left: number | undefined = event.clientX - pane.left;
      let top: number | undefined = event.clientY - pane.top;
      let right: number | undefined = undefined;
      let bottom: number | undefined = undefined;

      if (left + MENU_W > PANE_W) {
        left = undefined;
        right = PANE_W - (event.clientX - pane.left);
      }
      if (top + MENU_H > PANE_H) {
        top = undefined;
        bottom = PANE_H - (event.clientY - pane.top);
      }

      setMenu({ id: personId, top, left, right, bottom });
    },
    [setMenu],
  );

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

  const onNodeDragStop = useCallback<NodeMouseHandler>(
    (_, draggedNode) => {
      const selectedNodes = getNodes().filter(
        (node) => node.selected && node.type === "person",
      );
      const nodesToPersist = selectedNodes.some((node) => node.id === draggedNode.id)
        ? selectedNodes
        : [draggedNode];

      for (const node of nodesToPersist) {
        if (node.position) {
          setPosition(node.id, node.position);
        }
      }
    },
    [getNodes, setPosition],
  );

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
      panOnDrag={cursorMode === "pan"}
      selectionOnDrag={cursorMode === "select"}
      multiSelectionKeyCode={cursorMode === "select" ? null : undefined}
      selectionMode={cursorMode === "select" ? SelectionMode.Partial : undefined}
      onNodesChange={onNodesChange}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onNodeContextMenu={onNodeContextMenu}
      onEdgeClick={onEdgeClick}
      onConnect={onConnect}
      onPaneClick={() => {
        clearSelection();
        setMenu(null);
      }}
      nodesDraggable
      zoomOnDoubleClick={layoutMode !== "tree"}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
      style={{ background: "var(--rf-graph-canvas)" }}
    >
      <Background color="var(--rf-graph-grid-dot)" gap={26} />
      <Controls
        showInteractive={false}
        style={{
          background: "var(--rf-graph-control-bg)",
          borderColor: "var(--rf-graph-control-border)",
          borderRadius: "8px",
          color: "var(--rf-graph-control-text)",
          backdropFilter: "blur(14px)",
        }}
      />
      <Panel
        position="top-left"
        style={{
          marginTop: 72,
          marginLeft: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "transparent",
          border: "none",
          boxShadow: "none",
        }}
      >
        <button
          type="button"
          aria-label="Pan mode"
          title="Pan mode"
          onClick={() => setCursorMode("pan")}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border:
              cursorMode === "pan"
                ? "1px solid var(--rf-accent)"
                : "1px solid var(--rf-graph-control-border)",
            background:
              cursorMode === "pan"
                ? "color-mix(in srgb, var(--rf-accent) 14%, var(--rf-graph-control-bg))"
                : "var(--rf-graph-control-bg)",
            color:
              cursorMode === "pan"
                ? "var(--rf-accent)"
                : "var(--rf-graph-control-text)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <Hand size={16} />
        </button>
        <button
          type="button"
          aria-label="Selection mode"
          title="Selection mode"
          onClick={() => setCursorMode("select")}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border:
              cursorMode === "select"
                ? "1px solid var(--rf-accent)"
                : "1px solid var(--rf-graph-control-border)",
            background:
              cursorMode === "select"
                ? "color-mix(in srgb, var(--rf-accent) 14%, var(--rf-graph-control-bg))"
                : "var(--rf-graph-control-bg)",
            color:
              cursorMode === "select"
                ? "var(--rf-accent)"
                : "var(--rf-graph-control-text)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <MousePointer size={16} />
        </button>
      </Panel>
      <MinimapContainer nodes={nodes} edges={edges} />
      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
      <ViewportPortal>
        {layoutMode === "tree" && treeShape === "grouped" && groupedDivider ? (
          <div
            style={{
              position: "absolute",
              transform: `translate(${groupedDivider.x}px, ${groupedDivider.yTop}px)`,
              width: 0,
              height: groupedDivider.yBottom - groupedDivider.yTop,
              borderLeft: "2px solid rgba(150,145,140,0.5)",
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
                  fontSize: 16,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  opacity: 0.95,
                  pointerEvents: "none",
                  background: "var(--rf-graph-control-bg)",
                  border: "2px solid var(--rf-graph-control-border)",
                  backdropFilter: "blur(14px)",
                  borderRadius: 999,
                  padding: "4px 12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
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
