import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const swift: Vehicle = {
  id: 2,
  make: "Maruti",
  model: "Swift",
  year: 2023,
  category: "hatchback",
  price: "750000.00",
  quantity: 2,
  image_url: null,
  description: null,
  fuel_type: "petrol",
  transmission: null,
  engine: "1.2 L K-series",
  power: null,
  torque: null,
  drivetrain: null,
  seats: null,
  mileage: "24 km/l",
  color: null,
  location: null,
  stock_id: "WD-00002",
};

const bare: Vehicle = {
  id: 3,
  make: "Hyundai",
  model: "Creta",
  year: 2024,
  category: "suv",
  price: "1450000.00",
  quantity: 0,
  image_url: null,
  description: null,
  fuel_type: null,
  transmission: null,
  engine: null,
  power: null,
  torque: null,
  drivetrain: null,
  seats: null,
  mileage: null,
  color: null,
  location: null,
  stock_id: "WD-00003",
};

function Probe() {
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="search">{useLocation().search}</output>
      <button type="button" onClick={() => navigate(-1)}>
        history back
      </button>
    </>
  );
}

function renderDashboard(role: User["role"] = "user", url = "/") {
  auth.user = { id: 7, email: "person@example.com", full_name: "Test Person", role };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <DashboardPage />
        <Probe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const search = () => screen.getByTestId("search").textContent ?? "";
const openNexon = async () =>
  fireEvent.click(await screen.findByRole("button", { name: /^view 2024 tata nexon ev$/i }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listVehicles).mockResolvedValue([nexonEv, swift, bare]);
  vi.mocked(api.searchVehicles).mockResolvedValue([nexonEv]);
});

describe("opening the detail sheet", () => {
  it("gives each card a focusable native button named after the car", async () => {
    renderDashboard();

    const view = await screen.findByRole("button", { name: "View 2024 Tata Nexon EV" });
    expect(view.tagName).toBe("BUTTON");
    expect(view.getAttribute("tabindex")).not.toBe("-1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the sheet with the specs, stock and location, and writes ?car= to the URL", async () => {
    renderDashboard();
    await openNexon();

    const dialog = await screen.findByRole("dialog", { name: /2024 tata nexon ev/i });
    expect(within(dialog).getByText("Nexon EV")).toBeTruthy();
    expect(within(dialog).getByText("WD-00013")).toBeTruthy();
    expect(within(dialog).getByText("₹14,99,000")).toBeTruthy();
    expect(within(dialog).getByText("8 in stock")).toBeTruthy();
    expect(within(dialog).getByText("Popular electric compact SUV.")).toBeTruthy();
    for (const value of [
      "Electric",
      "Single-speed automatic",
      "40.5 kWh battery, PMSM motor",
      "142 bhp (106 kW)",
      "215 Nm",
      "FWD",
      "5 seats",
      "465 km range (ARAI)",
      "Daytona Grey",
      "EV",
    ]) {
      expect(within(dialog).getByText(value)).toBeTruthy();
    }
    // The location appears in the header line and in the Showroom tile.
    expect(within(dialog).getAllByText("Indiranagar, Bengaluru").length).toBeGreaterThanOrEqual(2);
    expect(search()).toBe("?car=13");
  });

  it("clicking anywhere on the card opens it", async () => {
    renderDashboard();

    fireEvent.click(await screen.findByText("₹14,99,000"));

    expect(await screen.findByRole("dialog", { name: /2024 tata nexon ev/i })).toBeTruthy();
    expect(search()).toBe("?car=13");
  });

  it("merges ?car= with the active filters", async () => {
    renderDashboard("user", "/?make=Tata");
    await openNexon();

    await screen.findByRole("dialog");
    const params = new URLSearchParams(search());
    expect(params.get("make")).toBe("Tata");
    expect(params.get("car")).toBe("13");
  });

  it("opens straight from /?car=13", async () => {
    renderDashboard("user", "/?car=13");

    const dialog = await screen.findByRole("dialog", { name: /2024 tata nexon ev/i });
    expect(within(dialog).getByText("Daytona Grey")).toBeTruthy();
  });

  it("drops a ?car= that matches no vehicle without opening anything", async () => {
    renderDashboard("user", "/?car=999");

    await screen.findByRole("button", { name: /^view 2024 tata nexon ev$/i });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(search()).toBe(""));
  });
});

describe("closing the detail sheet", () => {
  it("closes with Escape and removes only ?car", async () => {
    renderDashboard("user", "/?make=Tata&car=13");
    await screen.findByRole("dialog");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(search()).toBe("?make=Tata");
  });

  it("closes with the X button", async () => {
    renderDashboard();
    await openNexon();

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(new URLSearchParams(search()).has("car")).toBe(false);
  });

  it("closes on a backdrop click", async () => {
    renderDashboard("user", "/?car=13");
    const dialog = await screen.findByRole("dialog");

    fireEvent.mouseDown(dialog.parentElement as HTMLElement);

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(search()).toBe("");
  });

  it("closes when the browser goes Back", async () => {
    renderDashboard();
    await openNexon();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "history back" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(search()).toBe("");
  });
});

describe("controls inside the card", () => {
  it("purchasing from the card does not open the sheet", async () => {
    vi.mocked(api.purchaseVehicle).mockResolvedValue({ ...nexonEv, quantity: 7 });
    renderDashboard();

    const buttons = await screen.findAllByRole("button", { name: /^purchase$/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(api.purchaseVehicle).toHaveBeenCalledWith(13));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(search()).toBe("");
  });

  it("the admin menu keeps working and does not open the sheet", async () => {
    renderDashboard("admin");

    fireEvent.click(await screen.findByRole("button", { name: /manage 2024 tata nexon ev/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Edit" }));

    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].getAttribute("aria-labelledby")).toBeTruthy();
    expect(within(dialogs[0]).getByRole("button", { name: /save changes/i })).toBeTruthy();
    expect(search()).toBe("");
  });
});

describe("sheet content", () => {
  it("skips null specs and tiles for them", async () => {
    renderDashboard("user", "/?car=2");

    const dialog = await screen.findByRole("dialog", { name: /2023 maruti swift/i });
    expect(within(dialog).getByText("Petrol")).toBeTruthy();
    expect(within(dialog).getByText("1.2 L K-series")).toBeTruthy();
    expect(within(dialog).getByText("24 km/l")).toBeTruthy();
    for (const label of ["Transmission", "Power", "Torque", "Drivetrain", "Seating", "Colour", "Showroom"]) {
      expect(within(dialog).queryByText(label)).toBeNull();
    }
    expect(within(dialog).queryByText(/coming soon/i)).toBeNull();
    expect(within(dialog).getByText("Only 2 left")).toBeTruthy();
  });

  it("says specifications are coming soon when every spec is null, and shows sold out", async () => {
    renderDashboard("user", "/?car=3");

    const dialog = await screen.findByRole("dialog", { name: /2024 hyundai creta/i });
    expect(within(dialog).getByText(/specifications coming soon/i)).toBeTruthy();
    expect(within(dialog).queryByText("Fuel")).toBeNull();
    expect(within(dialog).getByText("Sold out", { selector: "p, span" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /sold out/i }).hasAttribute("disabled")).toBe(true);
  });

  it("relabels engine and mileage for electric cars only", async () => {
    renderDashboard("user", "/?car=13");

    const ev = await screen.findByRole("dialog", { name: /nexon ev/i });
    expect(within(ev).getByText("Battery & motor")).toBeTruthy();
    expect(within(ev).getByText("Range")).toBeTruthy();
    expect(within(ev).queryByText("Engine")).toBeNull();
    expect(within(ev).queryByText("Mileage")).toBeNull();
  });

  it("uses Engine and Mileage for non-electric cars", async () => {
    renderDashboard("user", "/?car=2");

    const dialog = await screen.findByRole("dialog", { name: /swift/i });
    expect(within(dialog).getByText("Engine")).toBeTruthy();
    expect(within(dialog).getByText("Mileage")).toBeTruthy();
    expect(within(dialog).queryByText("Battery & motor")).toBeNull();
    expect(within(dialog).queryByText("Range")).toBeNull();
  });

  it("purchases from the sheet and refreshes the list", async () => {
    vi.mocked(api.purchaseVehicle).mockResolvedValue({ ...nexonEv, quantity: 7 });
    renderDashboard("user", "/?car=13");

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^purchase$/i }));

    await waitFor(() => expect(api.purchaseVehicle).toHaveBeenCalledWith(13));
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/purchase complete/i)).toBeTruthy();
  });
});

describe("admin actions in the sheet", () => {
  it("shows no management actions to a normal user", async () => {
    renderDashboard("user", "/?car=13");

    const dialog = await screen.findByRole("dialog");
    for (const name of ["Edit", "Restock", "Delete"]) {
      expect(within(dialog).queryByRole("button", { name })).toBeNull();
    }
  });

  it("lets an admin edit, restock and delete from the sheet", async () => {
    renderDashboard("admin", "/?car=13");

    let dialog = await screen.findByRole("dialog", { name: /2024 tata nexon ev/i });
    fireEvent.click(within(dialog).getByRole("button", { name: "Edit" }));
    expect(await screen.findByRole("dialog", { name: /edit vehicle/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    dialog = await screen.findByRole("dialog", { name: /2024 tata nexon ev/i });
    fireEvent.click(within(dialog).getByRole("button", { name: "Restock" }));
    expect(await screen.findByRole("dialog", { name: /restock 2024 tata nexon ev/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    dialog = await screen.findByRole("dialog", { name: /2024 tata nexon ev/i });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alertdialog", { name: /delete 2024 tata nexon ev\?/i })).toBeTruthy();
  });
});
