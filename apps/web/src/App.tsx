/**
 * App — composition root.
 * Hydrates the store from persistence, then composes the shell, canvas, and
 * the three parallel feature overlays.
 */
import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { AppShell } from "./components/AppShell";
import { GraphCanvas } from "./graph/GraphCanvas";
import { useGraphStore } from "./store/useGraphStore";
import { CrudFeature } from "./features/crud";
import { IntelligenceFeature } from "./features/intelligence";
import { FilteringFeature } from "./features/filtering";
import { TimelineFeature } from "./features/timeline";
import { AuthProvider } from "./auth/AuthContext";
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
  const hydrated = useGraphStore((s) => s.hydrated);
  const hydrate = useGraphStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
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
            <TimelineFeature />
          </>
        }
      />
    </ReactFlowProvider>
  );
}
