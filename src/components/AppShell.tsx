/**
 * AppShell — application chrome.
 * Renders the header and hosts the graph canvas plus the three feature
 * overlays. Layout is intentionally flat: features position themselves as
 * absolute overlays within reserved regions (see each feature stub).
 */
import type { ReactNode } from "react";
import { Legend } from "./Legend";
import { useGraphStore } from "../store/useGraphStore";
import { useAuth } from "../auth/AuthContext";

interface AppShellProps {
  /** The graph canvas. */
  canvas: ReactNode;
  /** Feature overlays (Track A / B / C). */
  overlays: ReactNode;
}

export function AppShell({ canvas, overlays }: AppShellProps) {
  const layoutMode = useGraphStore((s) => s.layoutMode);
  const treeShape = useGraphStore((s) => s.treeShape);
  const treeRootId = useGraphStore((s) => s.treeRootId);
  const selectedPersonId = useGraphStore((s) => s.selectedPersonId);
  const setLayoutMode = useGraphStore((s) => s.setLayoutMode);
  const setTreeShape = useGraphStore((s) => s.setTreeShape);
  const setTreeRoot = useGraphStore((s) => s.setTreeRoot);

  const { signOut } = useAuth();

  return (
    <div className="flex h-screen w-screen flex-col bg-canvas">
      <header className="flex items-center justify-between border-b border-line bg-panel px-5 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-ink">
            <span className="font-sans tracking-tight">who</span>
            <span className="font-display text-2xl italic text-accent">nodes</span>
            <span className="font-sans tracking-tight">who</span>
          </h1>
          <span className="text-xs text-muted">personal relationship map</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-line bg-canvas p-0.5 text-xs">
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                layoutMode === "free" ? "bg-panel text-ink" : "text-muted"
              }`}
              onClick={() => setLayoutMode("free")}
            >
              Free
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                layoutMode === "tree" ? "bg-panel text-ink" : "text-muted"
              }`}
              onClick={() => {
                setLayoutMode("tree");
                if (selectedPersonId) setTreeRoot(selectedPersonId);
              }}
            >
              Tree
            </button>
          </div>
          {layoutMode === "tree" ? (
            <div className="inline-flex rounded-full border border-line bg-canvas p-0.5 text-xs">
              <button
                type="button"
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  treeShape === "grouped" ? "bg-panel text-ink" : "text-muted"
                }`}
                onClick={() => {
                  setTreeShape("grouped");
                  if (selectedPersonId) setTreeRoot(selectedPersonId);
                }}
              >
                Grouped
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  treeShape === "radial" ? "bg-panel text-ink" : "text-muted"
                }`}
                onClick={() => setTreeShape("radial")}
              >
                Radial
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  treeShape === "layered" ? "bg-panel text-ink" : "text-muted"
                }`}
                onClick={() => setTreeShape("layered")}
              >
                Layered
              </button>
            </div>
          ) : null}
          <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-muted">
            Phase 0 · foundation
          </span>
          <button
            onClick={signOut}
            className="text-xs font-medium text-muted hover:text-ink transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="relative flex-1 overflow-hidden">
        {canvas}
        {layoutMode === "tree" && treeRootId === null ? (
          <div className="pointer-events-none absolute left-1/2 top-5 z-40 -translate-x-1/2 rounded-full border border-line bg-panel/95 px-4 py-1.5 text-xs font-medium text-muted shadow-panel">
            Double-click a person to grow the tree.
          </div>
        ) : null}
        {overlays}
        <Legend />
      </main>
    </div>
  );
}
