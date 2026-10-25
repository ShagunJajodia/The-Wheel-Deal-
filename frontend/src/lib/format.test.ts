import { describe, expect, it } from "vitest";

import { formatINR } from "./format";

describe("formatINR", () => {
  it("formats API decimals as whole rupees with Indian digit grouping", () => {
    expect(formatINR("1250000.00")).toBe("₹12,50,000");
    expect(formatINR("750000")).toBe("₹7,50,000");
    expect(formatINR(99999)).toBe("₹99,999");
  });

  it("falls back to the raw value when it is not a number", () => {
    expect(formatINR("not-a-price")).toBe("not-a-price");
  });
});
