import React, { createContext, useContext, useEffect, useState } from "react";
import type { AuthSessionResponse } from "@relationflow/contracts";
import { apiGet, apiPost } from "../lib/apiClient";
import type { AuthState } from "./auth.types";
import { useGraphStore } from "../store/useGraphStore";

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  devSignIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    void apiGet<AuthSessionResponse>("/auth/me")
      .then((response) => {
        if (cancelled) return;
        setState({
          user: response.user,
          loading: false,
          error: null,
        });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setState({
          user: null,
          loading: false,
          error: error.message || "Unable to reach the backend.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const response = await apiPost<AuthSessionResponse>("/auth/login", {
        email,
        password,
      });
      setState({ user: response.user, loading: false, error: null });
    } catch (error) {
      setState((s) => ({
        ...s,
        error: error instanceof Error ? error.message : "Unable to sign in.",
      }));
    }
  };

  const signUp = async (email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const response = await apiPost<AuthSessionResponse>("/auth/register", {
        email,
        password,
      });
      setState({ user: response.user, loading: false, error: null });
    } catch (error) {
      setState((s) => ({
        ...s,
        error:
          error instanceof Error ? error.message : "Unable to create account.",
      }));
    }
  };

  const signOut = async () => {
    try {
      await apiPost<AuthSessionResponse>("/auth/logout");
    } finally {
      setState({ user: null, loading: false, error: null });
    }
    useGraphStore.getState().signOut();
  };

  const devSignIn = async () => {
    setState((s) => ({ ...s, error: null }));
    try {
      const response = await apiPost<AuthSessionResponse>("/auth/dev-login");
      setState({ user: response.user, loading: false, error: null });
    } catch (error) {
      setState((s) => ({
        ...s,
        error: error instanceof Error ? error.message : "Dev login failed.",
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        devSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
