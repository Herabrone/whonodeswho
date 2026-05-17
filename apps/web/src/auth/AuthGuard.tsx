import React from "react";
import { useAuth } from "./AuthContext";
import { LoginPage } from "./LoginPage";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas text-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold text-ink">
              <span className="font-sans tracking-tight">who</span>
              <span className="font-display text-2xl italic text-accent">nodes</span>
              <span className="font-sans tracking-tight">who</span>
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
