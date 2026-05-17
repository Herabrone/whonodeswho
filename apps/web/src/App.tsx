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
import { ChatFeature } from "./features/chat";
import { AuthProvider } from "./auth/AuthContext";
import { AuthGuard } from "./auth/AuthGuard";
import { useAuth } from "./auth/AuthContext";
import {
  buildCssVars,
  DESIGN_TOKENS_STYLE_ID,
  themeStorage,
} from "@/design-tokens";

if (typeof document !== "undefined") {
  let style = document.getElementById(DESIGN_TOKENS_STYLE_ID) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement("style");
    style.id = DESIGN_TOKENS_STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = buildCssVars();
  themeStorage.apply();
}

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
  const flushPersistence = useGraphStore((s) => s.flushPersistence);
  const saveDraft = useGraphStore((s) => s.saveDraft);

  useEffect(() => {
    if (!user) return;
    void hydrate(user.id);
  }, [hydrate, user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      void saveDraft("lifecycle");
      void flushPersistence();
    };

    const handlePageHide = () => {
      void saveDraft("lifecycle");
      void flushPersistence();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushPersistence, saveDraft]);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-rf-base text-rf-muted">
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
            <ChatFeature />
          </>
        }
      />
    </ReactFlowProvider>
  );
}
