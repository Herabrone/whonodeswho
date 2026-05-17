/**
 * AppShell - application chrome.
 * Renders the header and hosts the graph canvas plus the feature overlays.
 */
import { useState, type ReactNode } from "react";
import { themeStorage, type ThemeName } from "../design-tokens";
import { Legend } from "./Legend";
import { TimelineToggleButton } from "./TimelineToggleButton";
import { useGraphStore } from "../store/useGraphStore";
import { useAuth } from "../auth/AuthContext";
import { dispatchOpenImportExport } from "../features/crud/relationshipComposerEvent";
import { useAutoLayout } from "../graph/useAutoLayout";

interface AppShellProps {
  canvas: ReactNode;
  overlays: ReactNode;
}

export function AppShell({ canvas, overlays }: AppShellProps) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof document !== "undefined") {
      const appliedTheme = document.documentElement.getAttribute("data-theme");
      if (appliedTheme === "light" || appliedTheme === "dark") {
        return appliedTheme;
      }
    }

    return themeStorage.get();
  });
  const layoutMode = useGraphStore((s) => s.layoutMode);
  const treeShape = useGraphStore((s) => s.treeShape);
  const treeRootId = useGraphStore((s) => s.treeRootId);
  const selectedPersonId = useGraphStore((s) => s.selectedPersonId);
  const persistenceError = useGraphStore((s) => s.persistenceError);
  const recoveryDraft = useGraphStore((s) => s.recoveryDraft);
  const setLayoutMode = useGraphStore((s) => s.setLayoutMode);
  const setTreeShape = useGraphStore((s) => s.setTreeShape);
  const setTreeRoot = useGraphStore((s) => s.setTreeRoot);
  const restoreRecoveryDraft = useGraphStore((s) => s.restoreRecoveryDraft);
  const discardRecoveryDraft = useGraphStore((s) => s.discardRecoveryDraft);
  const clearPersistenceError = useGraphStore((s) => s.clearPersistenceError);

  const { signOut } = useAuth();
  const autoLayout = useAutoLayout();

  const applyTheme = (nextTheme: ThemeName) => {
    setTheme(nextTheme);
    themeStorage.set(nextTheme);
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-rf-base">
      <header className="flex items-center justify-between border-b border-rf-border bg-rf-surface px-5 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-rf-text">
            <span className="font-sans tracking-tight">who</span>
            <span className="font-display text-2xl italic text-rf-accent">nodes</span>
            <span className="font-sans tracking-tight">who</span>
          </h1>
          <span className="text-xs text-rf-muted">personal relationship map</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-rf-border bg-rf-base p-0.5 text-xs">
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                layoutMode === "free" ? "bg-rf-surface text-rf-text" : "text-rf-muted hover:text-rf-text"
              }`}
              onClick={() => setLayoutMode("free")}
            >
              Web
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                layoutMode === "tree" ? "bg-rf-surface text-rf-text" : "text-rf-muted hover:text-rf-text"
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
            <div className="inline-flex rounded-full border border-rf-border bg-rf-base p-0.5 text-xs">
              <button
                type="button"
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  treeShape === "grouped" ? "bg-rf-surface text-rf-text" : "text-rf-muted hover:text-rf-text"
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
                  treeShape === "radial" ? "bg-rf-surface text-rf-text" : "text-rf-muted hover:text-rf-text"
                }`}
                onClick={() => setTreeShape("radial")}
              >
                Radial
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  treeShape === "layered" ? "bg-rf-surface text-rf-text" : "text-rf-muted hover:text-rf-text"
                }`}
                onClick={() => setTreeShape("layered")}
              >
                Layered
              </button>
            </div>
          ) : null}
          <TimelineToggleButton />
          <div className="inline-flex rounded-full border border-rf-border bg-rf-base p-0.5 text-xs">
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                theme === "light" ? "bg-rf-surface text-rf-text" : "text-rf-muted hover:text-rf-text"
              }`}
              onClick={() => applyTheme("light")}
              aria-pressed={theme === "light"}
            >
              Light
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                theme === "dark" ? "bg-rf-surface text-rf-text" : "text-rf-muted hover:text-rf-text"
              }`}
              onClick={() => applyTheme("dark")}
              aria-pressed={theme === "dark"}
            >
              Dark
            </button>
          </div>
          <button
            type="button"
            onClick={() => dispatchOpenImportExport()}
            className="rounded-lg border border-rf-border bg-rf-base px-3 py-1 text-sm text-rf-text hover:bg-rf-surface"
          >
            Import / Export
          </button>

          <button
            type="button"
            onClick={autoLayout}
            className="rounded-lg border border-rf-border bg-rf-base px-3 py-1 text-sm text-rf-text hover:bg-rf-surface"
          >
            Auto Reorganize
          </button>

          <button
            onClick={signOut}
            className="text-xs font-medium text-rf-muted transition-colors hover:text-rf-text"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="relative flex-1 overflow-hidden">
        {canvas}
        {recoveryDraft ? (
          <div className="absolute left-1/2 top-5 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-rf-border bg-rf-surface px-4 py-3 text-xs text-rf-text shadow-panel">
            <div className="max-w-md">
              Unsaved graph changes from {new Date(recoveryDraft.updatedAt).toLocaleString()} were recovered locally.
            </div>
            <button
              type="button"
              className="rounded-full bg-rf-text px-3 py-1 font-medium text-rf-surface"
              onClick={() => void restoreRecoveryDraft()}
            >
              Restore draft
            </button>
            <button
              type="button"
              className="rounded-full border border-rf-border px-3 py-1 font-medium text-rf-muted"
              onClick={() => void discardRecoveryDraft()}
            >
              Discard
            </button>
          </div>
        ) : null}
        {persistenceError && !recoveryDraft ? (
          <div className="absolute left-1/2 top-5 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-rf-border bg-rf-surface px-4 py-2 text-xs font-medium text-rf-text shadow-panel">
            <span>{persistenceError}</span>
            <button
              type="button"
              className="text-rf-muted transition-colors hover:text-rf-text"
              onClick={clearPersistenceError}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {layoutMode === "tree" && treeRootId === null ? (
          <div className="pointer-events-none absolute left-1/2 top-5 z-40 -translate-x-1/2 rounded-full border border-rf-border bg-rf-surface px-4 py-1.5 text-xs font-medium text-rf-muted shadow-panel">
            Click a person to grow the tree.
          </div>
        ) : null}
        {overlays}
        <Legend />
      </main>
    </div>
  );
}
