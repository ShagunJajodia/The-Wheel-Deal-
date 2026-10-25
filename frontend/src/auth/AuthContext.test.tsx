import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, getStoredToken, storeToken } from "../api/client";
import type { User } from "../api/client";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, api: { ...actual.api, login: vi.fn(), me: vi.fn() } };
});

const person: User = { id: 7, email: "person@example.com", full_name: "Test Person", role: "user" };

function Probe() {
  const { token, user, isLoading, login } = useAuth();
  const [failure, setFailure] = useState("");
  return (
    <div>
      <output data-testid="token">{token ?? "none"}</output>
      <output data-testid="user">{user?.email ?? "none"}</output>
      <output data-testid="loading">{isLoading ? "yes" : "no"}</output>
      <output data-testid="failure">{failure}</output>
      <button
        type="button"
        onClick={() => login("person@example.com", "password1").catch((error: Error) => setFailure(error.message))}
      >
        Sign in
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  vi.mocked(api.login).mockReset();
  vi.mocked(api.me).mockReset();
});

describe("loading the profile for a stored token", () => {
  it("keeps the session when /me succeeds", async () => {
    storeToken("good-token");
    vi.mocked(api.me).mockResolvedValue(person);

    renderProbe();

    await waitFor(() => expect(text("user")).toBe("person@example.com"));
    expect(text("token")).toBe("good-token");
    expect(getStoredToken()).toBe("good-token");
  });

  it.each([
    ["a server error", new ApiError(500, "Internal error")],
    ["a network failure", new TypeError("Failed to fetch")],
  ])("signs the user out when /me fails with %s", async (_label, failure) => {
    storeToken("stale-token");
    vi.mocked(api.me).mockRejectedValue(failure);

    renderProbe();

    await waitFor(() => expect(text("loading")).toBe("no"));
    expect(text("token")).toBe("none");
    expect(text("user")).toBe("none");
    expect(getStoredToken()).toBeNull();
  });
});

describe("login", () => {
  it("forgets the token and rethrows when /me fails after a successful sign-in", async () => {
    vi.mocked(api.login).mockResolvedValue({ access_token: "fresh-token", token_type: "bearer" });
    vi.mocked(api.me).mockRejectedValue(new ApiError(500, "Profile unavailable"));

    renderProbe();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(text("failure")).toBe("Profile unavailable"));
    expect(getStoredToken()).toBeNull();
    expect(text("token")).toBe("none");
    expect(text("user")).toBe("none");
    expect(text("loading")).toBe("no");
  });
});

describe("auth:expired", () => {
  it("clears the stored token, the token state and the user", async () => {
    storeToken("good-token");
    vi.mocked(api.me).mockResolvedValue(person);
    renderProbe();
    await waitFor(() => expect(text("user")).toBe("person@example.com"));

    act(() => {
      window.dispatchEvent(new Event("auth:expired"));
    });

    expect(text("token")).toBe("none");
    expect(text("user")).toBe("none");
    expect(getStoredToken()).toBeNull();
  });
});
