import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { api } from "./api/client";
import type { User } from "./api/client";
import { AuthProvider } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

const auth = vi.hoisted(() => ({ signedIn: false }));

// Only the signed-in Shell test needs a user; the auth pages use the real provider.
vi.mock("./auth/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth/AuthContext")>();
  const user: User = { id: 1, email: "person@example.com", full_name: "Test Person", role: "user" };
  return {
    ...actual,
    useAuth: () =>
      auth.signedIn
        ? { token: "t", user, isLoading: false, login: vi.fn(), logout: vi.fn() }
        : actual.useAuth(),
  };
});

vi.mock("./api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/client")>();
  return {
    ...actual,
    api: { ...actual.api, listVehicles: vi.fn(), searchVehicles: vi.fn() },
  };
});

const DARK_QUERY = "(prefers-color-scheme: dark)";

function mockSystemTheme(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: dark && query === DARK_QUERY,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const isDark = () => document.documentElement.classList.contains("dark");

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.signedIn = false;
  document.documentElement.classList.remove("dark");
  mockSystemTheme(false);
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
  Reflect.deleteProperty(window, "matchMedia");
});

describe("theme toggle", () => {
  it("is on the login and register pages and starts in light mode", () => {
    renderLogin();

    const toggle = screen.getByRole("button", { name: "Switch to dark mode" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(isDark()).toBe(false);
  });

  it("is on the register page too", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeTruthy();
  });

  it("switches the html class, the label and aria-pressed, and persists the choice", () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(isDark()).toBe(true);
    expect(localStorage.getItem("wheel-deal-theme")).toBe("dark");
    const toggle = screen.getByRole("button", { name: "Switch to light mode" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(toggle);

    expect(isDark()).toBe(false);
    expect(localStorage.getItem("wheel-deal-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("defaults to dark when the system prefers dark", () => {
    mockSystemTheme(true);
    renderLogin();

    expect(isDark()).toBe(true);
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
    expect(localStorage.getItem("wheel-deal-theme")).toBeNull();
  });

  it("lets a saved choice win over the system preference", () => {
    mockSystemTheme(true);
    localStorage.setItem("wheel-deal-theme", "light");
    renderLogin();

    expect(isDark()).toBe(false);
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeTruthy();
  });

  it("still works when localStorage throws", () => {
    // Only the theme key is blocked; the auth provider's own token reads must keep working.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key: string) => {
      if (key === "wheel-deal-theme") throw new Error("blocked");
      return null;
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string) => {
      if (key === "wheel-deal-theme") throw new Error("blocked");
    });
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(isDark()).toBe(true);
  });

  it("is in the signed-in header as well", async () => {
    auth.signedIn = true;
    vi.mocked(api.listVehicles).mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const nav = await screen.findByRole("navigation", { name: "Main" });
    fireEvent.click(await screen.findByRole("button", { name: "Switch to dark mode" }));
    expect(isDark()).toBe(true);
    expect(nav.contains(screen.getByRole("button", { name: "Switch to light mode" }))).toBe(true);
  });
});

describe("no-flash script in index.html", () => {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const inline = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";
  const run = () => new Function(inline)();

  it("has an inline script in the head, before the app module", () => {
    expect(inline).toContain("wheel-deal-theme");
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf('src="/src/main.tsx"'));
  });

  it("adds the dark class for a saved dark choice", () => {
    localStorage.setItem("wheel-deal-theme", "dark");
    run();

    expect(isDark()).toBe(true);
  });

  it("follows the system preference when nothing is saved", () => {
    mockSystemTheme(true);
    run();

    expect(isDark()).toBe(true);
  });

  it("keeps light for a saved light choice even if the system is dark", () => {
    mockSystemTheme(true);
    localStorage.setItem("wheel-deal-theme", "light");
    run();

    expect(isDark()).toBe(false);
  });
});
