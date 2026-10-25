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

const nexonEv: Vehicle = {
  id: 13,
  make: "Tata",
  model: "Nexon EV",
  year: 2024,
  category: "ev",
  price: "1499000.00",
  quantity: 8,
  image_url: null,
  description: "Popular electric compact SUV.",
  fuel_type: "electric",
  transmission: "Single-speed automatic",
  engine: "40.5 kWh battery, PMSM motor",
  power: "142 bhp (106 kW)",
  torque: "215 Nm",
  drivetrain: "fwd",
  seats: 5,
  mileage: "465 km range (ARAI)",
  color: "Daytona Grey",
  location: "Indiranagar, Bengaluru",
  stock_id: "WD-00013",
};

function renderDashboard() {
  auth.user = { id: 7, email: "admin@example.com", full_name: "Admin", role: "admin" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listVehicles).mockResolvedValue([nexonEv]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stock id on the dashboard", () => {
  it("shows the stock id on the card", async () => {
    renderDashboard();

    expect(await screen.findByText("WD-00013")).toBeTruthy();
  });
});

describe("specifications in the vehicle form", () => {
  it("offers an optional Specifications section with every spec field", async () => {
    renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: /add vehicle/i }));
    const dialog = screen.getByRole("dialog", { name: /add vehicle/i });
    const section = within(dialog).getByRole("group", { name: /specifications/i });
    for (const label of [/fuel type/i, /transmission/i, /^engine/i, /power/i, /torque/i, /drivetrain/i, /seats/i, /mileage/i, /colour/i, /location/i]) {
      expect(within(section).getByLabelText(label)).toBeTruthy();
    }
    expect(within(section).getByLabelText(/fuel type/i).tagName).toBe("SELECT");
    expect(within(section).getByLabelText(/drivetrain/i).tagName).toBe("SELECT");
    expect((within(section).getByLabelText(/seats/i) as HTMLInputElement).type).toBe("number");
  });

  it("sends the filled specs on create and leaves blank ones unset", async () => {
    vi.mocked(api.createVehicle).mockResolvedValue({ ...nexonEv, id: 14 });
    renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: /add vehicle/i }));
    const dialog = screen.getByRole("dialog", { name: /add vehicle/i });
    fireEvent.change(within(dialog).getByLabelText(/^make/i), { target: { value: "Tata" } });
    fireEvent.change(within(dialog).getByLabelText(/^model/i), { target: { value: "Punch EV" } });
    fireEvent.change(within(dialog).getByLabelText(/^price/i), { target: { value: "1099000" } });
    fireEvent.change(within(dialog).getByLabelText(/fuel type/i), { target: { value: "electric" } });
    fireEvent.change(within(dialog).getByLabelText(/drivetrain/i), { target: { value: "fwd" } });
    fireEvent.change(within(dialog).getByLabelText(/seats/i), { target: { value: "5" } });
    fireEvent.change(within(dialog).getByLabelText(/^engine/i), { target: { value: "35 kWh battery" } });
    fireEvent.change(within(dialog).getByLabelText(/location/i), { target: { value: "Pune" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^add vehicle$/i }));

    await waitFor(() => expect(api.createVehicle).toHaveBeenCalledTimes(1));
    const body = vi.mocked(api.createVehicle).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(body).toMatchObject({
      make: "Tata",
      model: "Punch EV",
      fuel_type: "electric",
      drivetrain: "fwd",
      seats: 5,
      engine: "35 kWh battery",
      location: "Pune",
    });
    expect(body.torque ?? null).toBeNull();
    expect(body.color ?? null).toBeNull();
  });

  it("prefills specs on edit, clears one with null and never sends read-only keys", async () => {
    vi.mocked(api.updateVehicle).mockResolvedValue(nexonEv);
    renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: /manage 2024 tata nexon ev/i }));
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: /edit vehicle/i });
    expect((within(dialog).getByLabelText(/fuel type/i) as HTMLSelectElement).value).toBe("electric");
    expect((within(dialog).getByLabelText(/seats/i) as HTMLInputElement).value).toBe("5");
    expect((within(dialog).getByLabelText(/location/i) as HTMLInputElement).value).toBe("Indiranagar, Bengaluru");

    fireEvent.change(within(dialog).getByLabelText(/torque/i), { target: { value: "" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(api.updateVehicle).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(api.updateVehicle).mock.calls[0];
    expect(id).toBe(13);
    expect(Object.keys(body).sort()).toEqual([
      "category",
      "color",
      "description",
      "drivetrain",
      "engine",
      "fuel_type",
      "image_url",
      "location",
      "make",
      "mileage",
      "model",
      "power",
      "price",
      "seats",
      "torque",
      "transmission",
      "year",
    ]);
    expect(body).toMatchObject({ torque: null, seats: 5, fuel_type: "electric", drivetrain: "fwd" });
  });

  it("maps a 422 on seats onto the seats field", async () => {
    const real = await vi.importActual<typeof import("../api/client")>("../api/client");
    vi.mocked(api.createVehicle).mockImplementation(real.api.createVehicle);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: [{ loc: ["body", "seats"], msg: "Input should be less than or equal to 12", type: "less_than_equal" }],
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: /add vehicle/i }));
    const dialog = screen.getByRole("dialog", { name: /add vehicle/i });
    fireEvent.change(within(dialog).getByLabelText(/^make/i), { target: { value: "Tata" } });
    fireEvent.change(within(dialog).getByLabelText(/^model/i), { target: { value: "Bus" } });
    fireEvent.change(within(dialog).getByLabelText(/^price/i), { target: { value: "100" } });
    fireEvent.change(within(dialog).getByLabelText(/seats/i), { target: { value: "9" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^add vehicle$/i }));

    await within(dialog).findByText("Input should be less than or equal to 12");
    expect(within(dialog).getByLabelText(/seats/i).getAttribute("aria-invalid")).toBe("true");
    expect(within(dialog).getByLabelText(/^make/i).getAttribute("aria-invalid")).not.toBe("true");
  });
});
