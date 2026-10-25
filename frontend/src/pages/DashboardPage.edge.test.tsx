import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api } from "../api/client";
import type { User, Vehicle } from "../api/client";
import { DashboardPage } from "./DashboardPage";

const auth = vi.hoisted(() => ({ user: null as User | null }));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    token: "test-token",
    user: auth.user,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: {
      listVehicles: vi.fn(),
      searchVehicles: vi.fn(),
      purchaseVehicle: vi.fn(),
      createVehicle: vi.fn(),
      updateVehicle: vi.fn(),
      deleteVehicle: vi.fn(),
      restockVehicle: vi.fn(),
    },
  };
});

const nexon: Vehicle = {
  id: 1,
  make: "Tata",
  model: "Nexon",
  year: 2024,
  category: "suv",
  price: "1250000.00",
  quantity: 5,
  image_url: null,
  description: null,
};

const creta: Vehicle = {
  id: 3,
  make: "Hyundai",
  model: "Creta",
  year: 2024,
  category: "suv",
  price: "1450000.00",
  quantity: 4,
  image_url: null,
  description: null,
};

function LocationProbe() {
  return <output data-testid="search">{useLocation().search}</output>;
}

function renderDashboard(role: User["role"], url = "/") {
  auth.user = { id: 7, email: "person@example.com", full_name: "Test Person", role };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <DashboardPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function purchaseButton(model: string): Promise<HTMLButtonElement> {
  const card = (await screen.findByRole("heading", { name: model })).closest("article") as HTMLElement;
  return within(card).getByRole("button", { name: /^purchase$/i }) as HTMLButtonElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listVehicles).mockResolvedValue([nexon, creta]);
  vi.mocked(api.searchVehicles).mockResolvedValue([nexon]);
});

describe("purchasing from several cards", () => {
  it("keeps a card disabled while its own purchase is in flight, even after another card is bought", async () => {
    const first = deferred<Vehicle>();
    const second = deferred<Vehicle>();
    vi.mocked(api.purchaseVehicle).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    renderDashboard("user");

    const nexonButton = await purchaseButton("Nexon");
    const cretaButton = await purchaseButton("Creta");

    fireEvent.click(nexonButton);
    fireEvent.click(cretaButton);

    expect(api.purchaseVehicle).toHaveBeenCalledTimes(2);
    expect(nexonButton.disabled).toBe(true);
    expect(cretaButton.disabled).toBe(true);

    fireEvent.click(nexonButton);
    expect(api.purchaseVehicle).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve({ ...creta, quantity: 3 });
    });
    await waitFor(() => expect(cretaButton.disabled).toBe(false));
    expect(nexonButton.disabled).toBe(true);

    await act(async () => {
      first.resolve({ ...nexon, quantity: 4 });
    });
    await waitFor(() => expect(nexonButton.disabled).toBe(false));
    expect(api.purchaseVehicle).toHaveBeenCalledTimes(2);
  });

  it("calls purchase once when the same card is clicked twice in one tick", async () => {
    vi.mocked(api.purchaseVehicle).mockReturnValue(deferred<Vehicle>().promise);
    renderDashboard("user");
    const nexonButton = await purchaseButton("Nexon");

    act(() => {
      nexonButton.click();
      nexonButton.click();
    });

    expect(api.purchaseVehicle).toHaveBeenCalledTimes(1);
    expect(api.purchaseVehicle).toHaveBeenCalledWith(1);
  });

  it.each([
    ["404", new ApiError(404, "Vehicle not found")],
    ["500", new ApiError(500, "Internal error")],
  ])("refreshes the list after a failed purchase (%s)", async (_status, failure) => {
    vi.mocked(api.purchaseVehicle).mockRejectedValue(failure);
    renderDashboard("user");

    fireEvent.click(await purchaseButton("Nexon"));

    expect(await screen.findByRole("alert")).toBeTruthy();
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
  });
});

describe("a failing search", () => {
  it("offers Clear filters, hides the useless Retry, and recovers when filters are cleared", async () => {
    vi.mocked(api.searchVehicles).mockRejectedValue(
      new ApiError(422, "Input should be 'sedan', 'suv' or 'hatchback'"),
    );
    renderDashboard("user", "/?category=bogus");

    expect(await screen.findByText(/couldn't load vehicles/i)).toBeTruthy();
    expect(screen.getByText(/input should be 'sedan'/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByTestId("search").textContent).toBe("");
    expect(await screen.findByRole("heading", { name: "Nexon" })).toBeTruthy();
    expect(api.listVehicles).toHaveBeenCalled();
    expect(screen.queryByText(/couldn't load vehicles/i)).toBeNull();
  });

  it("keeps Retry for a server error", async () => {
    vi.mocked(api.searchVehicles).mockRejectedValue(new ApiError(500, "Internal error"));
    renderDashboard("user", "/?make=Tata");

    expect(await screen.findByText(/couldn't load vehicles/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
  });

  it("shows the previous results while a new search loads", async () => {
    renderDashboard("user");
    expect(await screen.findByRole("heading", { name: "Creta" })).toBeTruthy();
    const next = deferred<Vehicle[]>();
    vi.mocked(api.searchVehicles).mockReturnValue(next.promise);

    fireEvent.change(screen.getByLabelText("Make"), { target: { value: "Tata" } });

    await waitFor(() => expect(api.searchVehicles).toHaveBeenCalledWith({ make: "Tata" }));
    expect(screen.getByRole("heading", { name: "Creta" })).toBeTruthy();
    expect(screen.queryByLabelText("Loading vehicles")).toBeNull();

    await act(async () => {
      next.resolve([nexon]);
    });
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Creta" })).toBeNull());
  });

  it("does not send a request when min price is above max price", async () => {
    renderDashboard("user", "/?min_price=900&max_price=100");

    expect(await screen.findByRole("heading", { name: /check the price range/i })).toBeTruthy();
    expect(screen.getByText(/min price must not be higher than max price/i)).toBeTruthy();
    expect(screen.queryByLabelText("Loading vehicles")).toBeNull();
    expect(api.searchVehicles).not.toHaveBeenCalled();
    expect(api.listVehicles).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(await screen.findByRole("heading", { name: "Nexon" })).toBeTruthy();
  });
});

describe("a stale list after a 404", () => {
  it("refreshes the vehicles when deleting a car that is already gone", async () => {
    vi.mocked(api.deleteVehicle).mockRejectedValue(new ApiError(404, "Vehicle not found"));
    renderDashboard("admin");

    fireEvent.click(await screen.findByRole("button", { name: /manage 2024 tata nexon/i }));
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await within(dialog).findByText("Vehicle not found")).toBeTruthy();
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
  });

  it("refreshes the vehicles when restocking a car that is already gone", async () => {
    vi.mocked(api.restockVehicle).mockRejectedValue(new ApiError(404, "Vehicle not found"));
    renderDashboard("admin");

    fireEvent.click(await screen.findByRole("button", { name: /manage 2024 tata nexon/i }));
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Restock" }));
    const dialog = screen.getByRole("dialog", { name: /restock 2024 tata nexon/i });
    fireEvent.change(within(dialog).getByLabelText(/quantity/i), { target: { value: "3" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^restock$/i }));

    await waitFor(() => expect(api.restockVehicle).toHaveBeenCalledWith(1, 3));
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
  });
});

describe("the add vehicle dialog", () => {
  it("focuses the Make field on open and returns focus to the opener on close", async () => {
    renderDashboard("admin");
    const opener = await screen.findByRole("button", { name: /add vehicle/i });
    opener.focus();

    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: /add vehicle/i });
    expect(document.activeElement).toBe(within(dialog).getByLabelText(/^make/i));

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});
