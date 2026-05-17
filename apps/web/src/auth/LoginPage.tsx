import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signIn, signUp, error: authError } = useAuth();

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
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-rf-base p-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <h1 className="text-4xl font-semibold text-rf-text">
          <span className="font-sans tracking-tight">who</span>
          <span className="font-display text-5xl italic text-rf-accent">nodes</span>
          <span className="font-sans tracking-tight">who</span>
        </h1>
        <p className="text-sm text-rf-muted">personal relationship map</p>
      </div>

      <div className="w-full max-w-md rounded-xl border border-rf-border bg-rf-surface p-8 shadow-xl">
        <h2 className="mb-6 text-2xl font-semibold text-rf-text">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="email"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-rf-muted"
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
              className="w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text placeholder:text-rf-muted focus:border-rf-accent focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label 
              htmlFor="password"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-rf-muted"
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
              className="w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text placeholder:text-rf-muted focus:border-rf-accent focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label 
                htmlFor="confirmPassword"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-rf-muted"
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
                className="w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text placeholder:text-rf-muted focus:border-rf-accent focus:outline-none"
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
            className="flex w-full items-center justify-center rounded-lg bg-rf-accent px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
            className="text-center text-sm text-rf-muted hover:text-rf-text"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
