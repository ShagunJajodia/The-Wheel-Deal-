import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Vehicle } from "../api/client";
import { VehicleCard } from "./VehicleCard";

const vehicle: Vehicle = {
  id: 1,
  make: "Tata",
  model: "Nexon",
  year: 2025,
  category: "suv",
  price: "1250000.00",
  quantity: 5,
  image_url: null,
  description: null,
};

describe("VehicleCard", () => {
  it("disables purchase and shows Sold out when quantity is zero", () => {
    render(<VehicleCard vehicle={{ ...vehicle, quantity: 0 }} onPurchase={vi.fn()} />);

    const button = screen.getByRole("button", { name: /sold out/i });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("shows a low-stock hint for one to three vehicles", () => {
    render(<VehicleCard vehicle={{ ...vehicle, quantity: 3 }} onPurchase={vi.fn()} />);

    expect(screen.getByText(/only 3 left/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /purchase/i }).hasAttribute("disabled")).toBe(false);
  });
});
