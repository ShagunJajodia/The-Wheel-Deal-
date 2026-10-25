import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, getStoredToken, shouldRetry, storeToken } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("401 handling", () => {
  let assign: ReturnType<typeof vi.fn>;
  let expired: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    assign = vi.fn();
    expired = vi.fn();
    vi.stubGlobal("location", { pathname: "/register", assign });
    window.addEventListener("auth:expired", expired);
  });

  afterEach(() => {
    window.removeEventListener("auth:expired", expired);
  });

  it("clears the stored token and announces auth:expired without a hard redirect", async () => {
    storeToken("stale-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { detail: "Invalid token" })));

    await expect(api.me()).rejects.toMatchObject({ status: 401 });

    expect(assign).not.toHaveBeenCalled();
    expect(getStoredToken()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("does not navigate away from a public page when a protected call is refused", async () => {
    vi.stubGlobal("location", { pathname: "/", assign });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { detail: "Not authenticated" })));

    await expect(api.listVehicles()).rejects.toBeInstanceOf(ApiError);

    expect(assign).not.toHaveBeenCalled();
  });
});

describe("shouldRetry", () => {
  it("never retries a client error", () => {
    for (const status of [400, 401, 404, 409, 422]) {
      expect(shouldRetry(0, new ApiError(status, "nope"))).toBe(false);
    }
  });

  it("retries a server error or a network failure once", () => {
    expect(shouldRetry(0, new ApiError(500, "boom"))).toBe(true);
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetry(1, new ApiError(500, "boom"))).toBe(false);
    expect(shouldRetry(1, new TypeError("Failed to fetch"))).toBe(false);
  });
});
