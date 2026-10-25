import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api } from "../api/client";
import type { User, Vehicle } from "../api/client";
import { App } from "../App";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: {
      me: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      listVehicles: vi.fn(),
      searchVehicles: vi.fn(),
      purchaseVehicle: vi.fn(),
      createVehicle: vi.fn(),
      updateVehicle: vi.fn(),
      deleteVehicle: vi.fn(),
      restockVehicle: vi.fn(),
      checkout: vi.fn(),
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
const creta: Vehicle = { ...nexon, id: 3, make: "Hyundai", model: "Creta", price: "1450000.00", quantity: 4 };
const soldOut: Vehicle = { ...nexon, id: 4, make: "BMW", model: "M2", price: "9000000.00", quantity: 0 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderApp(userId = 7) {
  localStorage.setItem("wheel-deal-token", "test-token");
  const user: User = { id: userId, email: `u${userId}@example.com`, full_name: "Test Person", role: "user" };
  vi.mocked(api.me).mockResolvedValue(user);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function card(model: string): Promise<HTMLElement> {
  return (await screen.findByRole("heading", { name: model })).closest("article") as HTMLElement;
}

async function addToCart(model: string) {
  const article = await card(model);
  fireEvent.click(within(article).getByRole("button", { name: /add to cart|in cart/i }));
}

async function openCart() {
  fireEvent.click(await screen.findByRole("button", { name: /^cart, \d+ items?$/i }));
  return screen.findByRole("dialog", { name: /your cart/i });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listVehicles).mockResolvedValue([nexon, creta, soldOut]);
});

describe("shopping cart", () => {
  it("checks out two different cars in one call and then empties the cart", async () => {
    vi.mocked(api.checkout).mockResolvedValue({ items: [{ ...nexon, quantity: 3 }, { ...creta, quantity: 3 }] });
    renderApp();

    await addToCart("Nexon");
    await addToCart("Nexon");
    await addToCart("Creta");
    expect(screen.getByRole("button", { name: "Cart, 3 items" })).toBeTruthy();

    const drawer = await openCart();
    expect(within(drawer).getByText("₹39,50,000")).toBeTruthy();
    fireEvent.click(within(drawer).getByRole("button", { name: /^checkout$/i }));

    await waitFor(() => expect(api.checkout).toHaveBeenCalledTimes(1));
    expect(api.checkout).toHaveBeenCalledWith([
      { vehicle_id: 1, quantity: 2 },
      { vehicle_id: 3, quantity: 1 },
    ]);
    expect(await screen.findByText(/order placed: 3 cars/i)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Cart, 0 items" })).toBeTruthy();
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
  });

  it("keeps the cart and shows the API message when checkout is refused with 409", async () => {
    vi.mocked(api.checkout).mockRejectedValue(new ApiError(409, "Not enough stock for 2024 Tata Nexon"));
    renderApp();

    await addToCart("Nexon");
    const drawer = await openCart();
    fireEvent.click(within(drawer).getByRole("button", { name: /^checkout$/i }));

    expect((await within(drawer).findByRole("alert")).textContent).toContain("Not enough stock for 2024 Tata Nexon");
    expect(screen.getByRole("button", { name: "Cart, 1 item" })).toBeTruthy();
    await waitFor(() => expect(api.listVehicles).toHaveBeenCalledTimes(2));
  });

  it("flags a line whose stock dropped and blocks checkout until it is fixed", async () => {
    vi.mocked(api.checkout).mockRejectedValue(new ApiError(409, "Not enough stock for 2024 Tata Nexon"));
    renderApp();

    await addToCart("Nexon");
    await addToCart("Nexon");
    vi.mocked(api.listVehicles).mockResolvedValue([{ ...nexon, quantity: 1 }, creta, soldOut]);
    const drawer = await openCart();
    fireEvent.click(within(drawer).getByRole("button", { name: /^checkout$/i }));

    expect(await within(drawer).findByText(/only 1 left/i)).toBeTruthy();
    expect((within(drawer).getByRole("button", { name: /^checkout$/i }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(within(drawer).getByRole("button", { name: /decrease quantity of .*nexon/i }));
    await waitFor(() =>
      expect((within(drawer).getByRole("button", { name: /^checkout$/i }) as HTMLButtonElement).disabled).toBe(false),
    );
  });

  it("disables Add to cart for a sold-out car and once the cart holds all the stock", async () => {
    renderApp();

    const soldOutCard = await card("M2");
    expect((within(soldOutCard).getByRole("button", { name: /add to cart/i }) as HTMLButtonElement).disabled).toBe(true);

    const cretaCard = await card("Creta");
    for (let i = 0; i < 4; i++) {
      fireEvent.click(within(cretaCard).getByRole("button", { name: /add to cart|in cart/i }));
    }
    const inCart = within(cretaCard).getByRole("button", { name: /in cart \(4\)/i }) as HTMLButtonElement;
    expect(inCart.disabled).toBe(true);
    expect(within(cretaCard).getByRole("button", { name: /^purchase$/i })).toBeTruthy();
  });

  it("persists the cart across a remount, separately for each user", async () => {
    const first = renderApp(7);
    await addToCart("Nexon");
    await addToCart("Creta");
    expect(screen.getByRole("button", { name: "Cart, 2 items" })).toBeTruthy();
    expect(localStorage.getItem("wheel-deal-cart:7")).toContain('"vehicleId":1');
    first.unmount();

    const second = renderApp(7);
    expect(await screen.findByRole("button", { name: "Cart, 2 items" })).toBeTruthy();
    second.unmount();

    renderApp(8);
    expect(await screen.findByRole("button", { name: "Cart, 0 items" })).toBeTruthy();
  });

  it("disables Checkout while the request is in flight", async () => {
    const pending = deferred<{ items: Vehicle[] }>();
    vi.mocked(api.checkout).mockReturnValue(pending.promise);
    renderApp();

    await addToCart("Nexon");
    const drawer = await openCart();
    const button = within(drawer).getByRole("button", { name: /^checkout$/i }) as HTMLButtonElement;
    fireEvent.click(button);
    fireEvent.click(button);

    expect(api.checkout).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);

    await act(async () => {
      pending.resolve({ items: [nexon] });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("lets the user change quantity and remove a line", async () => {
    renderApp();

    await addToCart("Creta");
    const drawer = await openCart();
    fireEvent.click(within(drawer).getByRole("button", { name: /increase quantity of .*creta/i }));
    expect(screen.getByRole("button", { name: "Cart, 2 items" })).toBeTruthy();
    fireEvent.click(within(drawer).getByRole("button", { name: /remove .*creta/i }));
    expect(within(drawer).getByText(/your cart is empty/i)).toBeTruthy();
  });
});
