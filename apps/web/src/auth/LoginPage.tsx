import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signIn, signUp, devSignIn, error: authError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-canvas p-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <h1 className="text-4xl font-semibold text-ink">
          <span className="font-sans tracking-tight">who</span>
          <span className="font-display text-5xl italic text-accent">nodes</span>
          <span className="font-sans tracking-tight">who</span>
        </h1>
        <p className="text-sm text-muted">personal relationship map</p>
      </div>

      <div className="w-full max-w-md rounded-xl border border-line bg-panel p-8 shadow-xl">
        <h2 className="mb-6 text-2xl font-semibold text-ink">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label 
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="••••••••"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label 
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="••••••••"
              />
            </div>
          )}

          {(authError || localError) && (
            <p className="text-sm font-medium text-red-600">
              {localError || authError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setLocalError(null);
            }}
            className="text-center text-sm text-muted hover:text-ink"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>

          {import.meta.env.DEV && (
            <div className="border-t border-line pt-4">
              <p className="mb-2 text-center text-xs text-muted">Dev shortcut</p>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await devSignIn();
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-accent/40 bg-accent/5 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                ) : null}
                Dev login →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
