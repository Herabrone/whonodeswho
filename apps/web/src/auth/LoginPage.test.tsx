import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { AuthProvider } from "./AuthContext";

vi.mock("../lib/apiClient", () => ({
  apiGet: vi.fn(() => Promise.resolve({ user: null })),
  apiPost: vi.fn(() => Promise.resolve({ user: null })),
}));

describe("LoginPage", () => {
  it("renders sign in header by default", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeDefined();
  });

  it("toggles to sign up mode", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
    const toggleBtn = screen.getByRole("button", { name: /don't have an account/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("heading", { name: /create account/i })).toBeDefined();
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
  });

  it("validates password match on sign up", async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
    
    // Switch to signup
    fireEvent.click(screen.getByRole("button", { name: /don't have an account/i }));
    
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[0], { target: { value: "password123" } });
    fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[1], { target: { value: "password456" } });
    
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    
    expect(await screen.findByText(/passwords do not match/i)).toBeDefined();
  });
});
