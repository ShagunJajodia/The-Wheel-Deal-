import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterBar } from "./FilterBar";

function QueryProbe() {
  const location = useLocation();
  return <output data-testid="query">{location.search}</output>;
}

afterEach(() => vi.useRealTimers());

describe("FilterBar", () => {
  it("keeps filters in the URL and debounces make and model", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <FilterBar />
        <QueryProbe />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Make"), { target: { value: "Tata" } });
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "Nexon" } });
    fireEvent.click(screen.getByRole("button", { name: "SUV" }));
    fireEvent.change(screen.getByLabelText("Min price"), { target: { value: "500000" } });
    fireEvent.change(screen.getByLabelText("Max price"), { target: { value: "1500000" } });

    const beforeDebounce = new URLSearchParams(screen.getByTestId("query").textContent ?? "");
    expect(beforeDebounce.get("make")).toBeNull();
    expect(beforeDebounce.get("model")).toBeNull();

    act(() => vi.advanceTimersByTime(300));

    const filters = new URLSearchParams(screen.getByTestId("query").textContent ?? "");
    expect(filters.get("make")).toBe("Tata");
    expect(filters.get("model")).toBe("Nexon");
    expect(filters.get("category")).toBe("suv");
    expect(filters.get("min_price")).toBe("500000");
    expect(filters.get("max_price")).toBe("1500000");
  });
});
