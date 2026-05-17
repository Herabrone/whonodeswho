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
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AuthGuard } from "./auth/AuthGuard";

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard>
        <AuthenticatedApp />
      </AuthGuard>
    </AuthProvider>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const hydrated = useGraphStore((s) => s.hydrated);
  const hydrate = useGraphStore((s) => s.hydrate);

  useEffect(() => {
    if (!user) return;

    void hydrate(user.id).then(() => {
      // First run for this user: empty persisted graph -> load the demo web.
      const s = useGraphStore.getState();
      if (s.people.length === 0) {
        s.replaceGraph(SEED_GRAPH);
        for (const [id, pos] of Object.entries(SEED_POSITIONS)) {
          s.setPosition(id, pos);
        }
      }
    });
  }, [user, hydrate]);

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
