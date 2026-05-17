/**
 * AppShell — application chrome.
 * Renders the header and hosts the graph canvas plus the three feature
 * overlays. Layout is intentionally flat: features position themselves as
 * absolute overlays within reserved regions (see each feature stub).
 */
import type { ReactNode } from "react";
import { Legend } from "./Legend";

interface AppShellProps {
  /** The graph canvas. */
  canvas: ReactNode;
  /** Feature overlays (Track A / B / C). */
  overlays: ReactNode;
}

export function AppShell({ canvas, overlays }: AppShellProps) {
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
        <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-muted">
          Phase 0 · foundation
        </span>
      </header>
      <main className="relative flex-1 overflow-hidden">
        {canvas}
        {overlays}
        <Legend />
      </main>
    </div>
  );
}
