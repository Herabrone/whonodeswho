import { act } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { AuthProvider } from "./AuthContext";

vi.mock("../lib/apiClient", () => ({
  apiGet: vi.fn(() => Promise.resolve({ user: null })),
  apiPost: vi.fn(() => Promise.resolve({ user: null })),
}));

async function renderLoginPage() {
  const user = userEvent.setup();

  render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );

  await act(async () => {});

  return { user };
}

describe("LoginPage", () => {
  it("renders sign in header by default", async () => {
    await renderLoginPage();
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeDefined();
  });

  it("toggles to sign up mode", async () => {
    const { user } = await renderLoginPage();
    const toggleBtn = screen.getByRole("button", { name: /don't have an account/i });
    await user.click(toggleBtn);
    expect(screen.getByRole("heading", { name: /create account/i })).toBeDefined();
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
  });

  it("validates password match on sign up", async () => {
    const { user } = await renderLoginPage();

    // Switch to signup
    await user.click(screen.getByRole("button", { name: /don't have an account/i }));

    await user.type(screen.getByPlaceholderText(/you@example.com/i), "test@example.com");
    await user.type(screen.getAllByPlaceholderText(/••••••••/i)[0], "password123");
    await user.type(screen.getAllByPlaceholderText(/••••••••/i)[1], "password456");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeDefined();
  });
});
