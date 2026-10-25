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

  it("debounces the price inputs like make and model", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <FilterBar />
        <QueryProbe />
      </MemoryRouter>,
    );
    const query = () => new URLSearchParams(screen.getByTestId("query").textContent ?? "");

    fireEvent.change(screen.getByLabelText("Min price"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Min price"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Min price"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Max price"), { target: { value: "9000" } });

    expect((screen.getByLabelText("Min price") as HTMLInputElement).value).toBe("500");
    expect(query().get("min_price")).toBeNull();
    expect(query().get("max_price")).toBeNull();

    act(() => vi.advanceTimersByTime(299));
    expect(query().get("min_price")).toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(query().get("min_price")).toBe("500");
    expect(query().get("max_price")).toBe("9000");
  });

  it("warns inline when min price is above max price", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <FilterBar />
      </MemoryRouter>,
    );
    const min = screen.getByLabelText("Min price");
    const max = screen.getByLabelText("Max price");
    expect(screen.queryByText(/min price must not be higher than max price/i)).toBeNull();

    fireEvent.change(min, { target: { value: "900" } });
    fireEvent.change(max, { target: { value: "100" } });

    const hint = screen.getByText(/min price must not be higher than max price/i);
    expect(min.getAttribute("aria-invalid")).toBe("true");
    expect(max.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(min.getAttribute("aria-describedby") ?? "")).toBe(hint);
    expect(document.getElementById(max.getAttribute("aria-describedby") ?? "")).toBe(hint);

    fireEvent.change(max, { target: { value: "1000" } });

    expect(screen.queryByText(/min price must not be higher than max price/i)).toBeNull();
    expect(min.getAttribute("aria-invalid")).not.toBe("true");
  });

  it("keeps the last valid price range in the URL while a half-typed max is below min", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter initialEntries={["/?min_price=1000000&max_price=1500000"]}>
        <FilterBar />
        <QueryProbe />
      </MemoryRouter>,
    );
    const query = () => new URLSearchParams(screen.getByTestId("query").textContent ?? "");
    const max = screen.getByLabelText("Max price");

    fireEvent.change(max, { target: { value: "2" } });
    act(() => vi.advanceTimersByTime(300));

    expect(query().get("min_price")).toBe("1000000");
    expect(query().get("max_price")).toBe("1500000");
    expect(screen.getByText(/min price must not be higher than max price/i)).toBeTruthy();

    fireEvent.change(max, { target: { value: "2000000" } });
    act(() => vi.advanceTimersByTime(300));

    expect(query().get("max_price")).toBe("2000000");
  });

  it("shows the typed prices in rupees so the unit is clear", () => {
    render(
      <MemoryRouter>
        <FilterBar />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Min price"), { target: { value: "1500000" } });
    fireEvent.change(screen.getByLabelText("Max price"), { target: { value: "25" } });

    expect(screen.getByText("₹15,00,000")).toBeTruthy();
    expect(screen.getByText("₹25")).toBeTruthy();
  });

  it("empties the price inputs when filters are cleared elsewhere", () => {
    render(
      <MemoryRouter initialEntries={["/?min_price=100&max_price=900"]}>
        <FilterBar />
        <ClearFromOutside />
      </MemoryRouter>,
    );
    expect((screen.getByLabelText("Min price") as HTMLInputElement).value).toBe("100");

    fireEvent.click(screen.getByRole("button", { name: "Clear from outside" }));

    expect((screen.getByLabelText("Min price") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Max price") as HTMLInputElement).value).toBe("");
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
