import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
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
  description: "Compact SUV.",
};

const swift: Vehicle = {
  id: 2,
  make: "Maruti",
  model: "Swift",
  year: 2023,
  category: "hatchback",
  price: "750000.00",
  quantity: 0,
  image_url: null,
  description: null,
};

function renderDashboard(role: User["role"]) {
  auth.user = { id: 7, email: "person@example.com", full_name: "Test Person", role };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openCardMenu(car: string, item: "Edit" | "Restock" | "Delete") {
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`manage ${car}`, "i") }));
  fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: item }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listVehicles).mockResolvedValue([nexon, swift]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin controls visibility", () => {
  it("hides every admin control from a normal user", async () => {
    renderDashboard("user");

    expect(await screen.findByText("Nexon")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^purchase$/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /add vehicle/i })).toBeNull();
    expect(screen.queryAllByRole("button", { name: /^manage /i })).toHaveLength(0);
  });

  it("shows the add button and a per-card menu to an admin", async () => {
    renderDashboard("admin");

    expect(await screen.findByRole("button", { name: /add vehicle/i })).toBeTruthy();
    const nexonMenu = await screen.findByRole("button", { name: /manage 2024 tata nexon/i });
    expect(screen.getByRole("button", { name: /manage 2023 maruti swift/i })).toBeTruthy();

    fireEvent.click(nexonMenu);
    const menu = screen.getByRole("menu");
    for (const item of ["Edit", "Restock", "Delete"]) {
      expect(within(menu).getByRole("menuitem", { name: item })).toBeTruthy();
    }
  });
});

describe("delete confirmation", () => {
  it("does not call DELETE until the admin confirms", async () => {
    vi.mocked(api.deleteVehicle).mockResolvedValue(undefined);
    renderDashboard("admin");

    await openCardMenu("2024 Tata Nexon", "Delete");

    const dialog = screen.getByRole("alertdialog", { name: /delete 2024 tata nexon\?/i });
    expect(api.deleteVehicle).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(api.deleteVehicle).toHaveBeenCalledWith(1));
    expect(api.deleteVehicle).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("never calls DELETE when the admin cancels", async () => {
    renderDashboard("admin");

    await openCardMenu("2024 Tata Nexon", "Delete");
    const dialog = screen.getByRole("alertdialog", { name: /delete 2024 tata nexon\?/i });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(api.deleteVehicle).not.toHaveBeenCalled();
  });

  it("treats Escape as cancel", async () => {
    renderDashboard("admin");

    await openCardMenu("2024 Tata Nexon", "Delete");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(api.deleteVehicle).not.toHaveBeenCalled();
  });
});

describe("add and edit vehicle", () => {
  it("creates a vehicle from the modal and refreshes the list", async () => {
    vi.mocked(api.createVehicle).mockResolvedValue({ ...nexon, id: 3 });
    renderDashboard("admin");

    fireEvent.click(await screen.findByRole("button", { name: /add vehicle/i }));
    const dialog = screen.getByRole("dialog", { name: /add vehicle/i });
    fireEvent.change(within(dialog).getByLabelText(/^make/i), { target: { value: "Hyundai" } });
    fireEvent.change(within(dialog).getByLabelText(/^model/i), { target: { value: "Creta" } });
    fireEvent.change(within(dialog).getByLabelText(/^year/i), { target: { value: "2024" } });
    fireEvent.change(within(dialog).getByLabelText(/^category/i), { target: { value: "suv" } });
    fireEvent.change(within(dialog).getByLabelText(/^price/i), { target: { value: "1450000" } });
    fireEvent.change(within(dialog).getByLabelText(/^quantity/i), { target: { value: "4" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^add vehicle$/i }));

    await waitFor(() =>
      expect(api.createVehicle).toHaveBeenCalledWith({
        make: "Hyundai",
        model: "Creta",
        year: 2024,
        category: "suv",
        price: "1450000",
        quantity: 4,
        image_url: null,
        description: null,
      }),
    );
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("maps a 422 response onto the price field", async () => {
    const real = await vi.importActual<typeof import("../api/client")>("../api/client");
    vi.mocked(api.createVehicle).mockImplementation(real.api.createVehicle);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: [
              {
                loc: ["body", "price"],
                msg: "Input should be greater than 0",
                type: "greater_than",
              },
            ],
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    renderDashboard("admin");

    fireEvent.click(await screen.findByRole("button", { name: /add vehicle/i }));
    const dialog = screen.getByRole("dialog", { name: /add vehicle/i });
    fireEvent.change(within(dialog).getByLabelText(/^make/i), { target: { value: "Hyundai" } });
    fireEvent.change(within(dialog).getByLabelText(/^model/i), { target: { value: "Creta" } });
    fireEvent.change(within(dialog).getByLabelText(/^price/i), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^add vehicle$/i }));

    const message = await within(dialog).findByText("Input should be greater than 0");
    const price = within(dialog).getByLabelText(/^price/i);
    expect(price.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(price.getAttribute("aria-describedby") ?? "")).toBe(message);
    expect(within(dialog).getByLabelText(/^make/i).getAttribute("aria-invalid")).not.toBe("true");
  });

  it("edits with a prefilled form and sends only the updatable keys", async () => {
    vi.mocked(api.updateVehicle).mockResolvedValue({ ...nexon, price: "1300000" });
    renderDashboard("admin");

    await openCardMenu("2024 Tata Nexon", "Edit");
    const dialog = screen.getByRole("dialog", { name: /edit vehicle/i });
    expect((within(dialog).getByLabelText(/^make/i) as HTMLInputElement).value).toBe("Tata");
    expect((within(dialog).getByLabelText(/^price/i) as HTMLInputElement).value).toBe("1250000.00");
    expect(within(dialog).queryByLabelText(/quantity/i)).toBeNull();

    fireEvent.change(within(dialog).getByLabelText(/^price/i), { target: { value: "1300000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(api.updateVehicle).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(api.updateVehicle).mock.calls[0];
    expect(id).toBe(1);
    expect(Object.keys(body).sort()).toEqual([
      "category",
      "description",
      "image_url",
      "make",
      "model",
      "price",
      "year",
    ]);
    expect(body).toEqual({
      make: "Tata",
      model: "Nexon",
      year: 2024,
      category: "suv",
      price: "1300000",
      image_url: null,
      description: "Compact SUV.",
    });
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
  });
});

describe("restock", () => {
  it("requires a quantity of at least 1 before calling the API", async () => {
    vi.mocked(api.restockVehicle).mockResolvedValue({ ...nexon, quantity: 8 });
    renderDashboard("admin");

    await openCardMenu("2024 Tata Nexon", "Restock");
    const dialog = screen.getByRole("dialog", { name: /restock 2024 tata nexon/i });
    const quantity = within(dialog).getByLabelText(/quantity/i);

    fireEvent.change(quantity, { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^restock$/i }));
    expect(api.restockVehicle).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("alert")).toBeTruthy();

    fireEvent.change(quantity, { target: { value: "3" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^restock$/i }));

    await waitFor(() => expect(api.restockVehicle).toHaveBeenCalledWith(1, 3));
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
  });
});
