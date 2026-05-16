/**
 * App — composition root.
 * Hydrates the store from persistence, seeds a demo graph on first run, then
 * composes the shell, canvas, and the three parallel feature overlays.
 */
import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { AppShell } from "./components/AppShell";
import { GraphCanvas } from "./graph/GraphCanvas";
import { useGraphStore } from "./store/useGraphStore";
import { SEED_GRAPH, SEED_POSITIONS } from "./data/seed";
import { CrudFeature } from "./features/crud";
import { IntelligenceFeature } from "./features/intelligence";
import { FilteringFeature } from "./features/filtering";

export default function App() {
  const hydrated = useGraphStore((s) => s.hydrated);
  const hydrate = useGraphStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate().then(() => {
      // First run: empty persisted graph -> load the demo web.
      const s = useGraphStore.getState();
      if (s.people.length === 0) {
        s.replaceGraph(SEED_GRAPH);
        for (const [id, pos] of Object.entries(SEED_POSITIONS)) {
          s.setPosition(id, pos);
        }
      }
    });
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas text-muted">
        Loading graph…
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <AppShell
        canvas={<GraphCanvas />}
        overlays={
          <>
            <CrudFeature />
            <IntelligenceFeature />
            <FilteringFeature />
          </>
        }
      />
    </ReactFlowProvider>
  );
}
