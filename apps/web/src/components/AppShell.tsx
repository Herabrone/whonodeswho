/**
 * AppShell - application chrome.
 * Renders the header and hosts the graph canvas plus the feature overlays.
 */
import { useState, type ReactNode, useRef, useEffect } from "react";
import { themeStorage, type ThemeName } from "../design-tokens";
import { Legend } from "./Legend";
import { TimelineToggleButton } from "./TimelineToggleButton";
import { TimelineDateChip } from "../features/timeline/TimelineDateChip";
import { useGraphStore } from "../store/useGraphStore";
import { useAuth } from "../auth/AuthContext";
import { dispatchOpenImportExport } from "../features/crud/relationshipComposerEvent";

interface AppShellProps {
  canvas: ReactNode;
  overlays: ReactNode;
}

const TREE_SHAPES = [
  {
    id: "grouped",
    label: "Grouped",
    description: "Focus on the root person and their immediate connections grouped by category.",
  },
  {
    id: "radial",
    label: "Radial",
    description: "Spread connections outward in concentric rings, showing depth and generations.",
  },
  {
    id: "layered",
    label: "Layered",
    description: "Classic top-down hierarchy showing clear generations or levels of separation.",
  },
] as const;

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

  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const layoutMode = useGraphStore((s) => s.layoutMode);
  const treeShape = useGraphStore((s) => s.treeShape);
  const treeRootId = useGraphStore((s) => s.treeRootId);
  const selectedPersonId = useGraphStore((s) => s.selectedPersonId);
  const persistenceError = useGraphStore((s) => s.persistenceError);
  const recoveryDraft = useGraphStore((s) => s.recoveryDraft);
  const timelineOpen = useGraphStore((s) => s.timelineOpen);
  const setLayoutMode = useGraphStore((s) => s.setLayoutMode);
  const setTreeShape = useGraphStore((s) => s.setTreeShape);
  const setTreeRoot = useGraphStore((s) => s.setTreeRoot);
  const restoreRecoveryDraft = useGraphStore((s) => s.restoreRecoveryDraft);
  const discardRecoveryDraft = useGraphStore((s) => s.discardRecoveryDraft);
  const clearPersistenceError = useGraphStore((s) => s.clearPersistenceError);

  const { signOut } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShapeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const applyTheme = (nextTheme: ThemeName) => {
    setTheme(nextTheme);
    themeStorage.set(nextTheme);
  };

  const currentShape = TREE_SHAPES.find((s) => s.id === treeShape) ?? TREE_SHAPES[0];

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
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShapeMenuOpen(!shapeMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-rf-border bg-rf-base px-4 py-1.5 text-xs font-medium text-rf-text transition-colors hover:bg-rf-surface"
              >
                <span>Layout: {currentShape.label}</span>
                <svg
                  className={`h-3 w-3 transition-transform ${shapeMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {shapeMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-rf-border bg-rf-surface p-1 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    {TREE_SHAPES.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setTreeShape(option.id as any);
                          if (option.id === "grouped" && selectedPersonId) {
                            setTreeRoot(selectedPersonId);
                          }
                          setShapeMenuOpen(false);
                        }}
                        className={`flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-rf-subtle ${
                          treeShape === option.id ? "bg-rf-subtle/50" : ""
                        }`}
                      >
                        <span className={`text-sm font-semibold ${treeShape === option.id ? "text-rf-accent" : "text-rf-text"}`}>
                          {option.label}
                        </span>
                        <span className="mt-1 text-xs leading-relaxed text-rf-muted">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <TimelineToggleButton />
          {timelineOpen ? <TimelineDateChip /> : null}
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
