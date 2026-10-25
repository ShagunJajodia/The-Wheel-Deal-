import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useSearchParams } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterBar } from "./FilterBar";

function QueryProbe() {
  const location = useLocation();
  return <output data-testid="query">{location.search}</output>;
}

function ClearFromOutside() {
  const [, setParams] = useSearchParams();
  return <button type="button" onClick={() => setParams({})}>Clear from outside</button>;
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

  it("empties the make and model inputs when filters are cleared elsewhere", () => {
    render(
      <MemoryRouter initialEntries={["/?make=Tata&model=Nexon"]}>
        <FilterBar />
        <ClearFromOutside />
      </MemoryRouter>,
    );
    expect((screen.getByLabelText("Make") as HTMLInputElement).value).toBe("Tata");
    expect((screen.getByLabelText("Model") as HTMLInputElement).value).toBe("Nexon");

    fireEvent.click(screen.getByRole("button", { name: "Clear from outside" }));

    expect((screen.getByLabelText("Make") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Model") as HTMLInputElement).value).toBe("");
  });

  it("works as a drawer: focuses close, closes on Escape, and clears everything", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={["/?category=suv&min_price=500000"]}>
        <FilterBar open onClose={onClose} />
        <QueryProbe />
      </MemoryRouter>,
    );

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close filters" }));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Show results" }));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByTestId("query").textContent).toBe("");
  });

  it("disables Clear all when no filter is active", () => {
    render(
      <MemoryRouter>
        <FilterBar open onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Clear all" }).hasAttribute("disabled")).toBe(true);
  });
});
