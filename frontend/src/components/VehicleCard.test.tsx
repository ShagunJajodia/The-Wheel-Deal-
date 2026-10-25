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

  it("formats the price as whole rupees", () => {
    render(<VehicleCard vehicle={vehicle} onPurchase={vi.fn()} />);

    expect(screen.getByText("₹12,50,000")).toBeTruthy();
  });

  it("shows a placeholder instead of an image when image_url is null", () => {
    render(<VehicleCard vehicle={vehicle} onPurchase={vi.fn()} />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("suv")).toBeTruthy();
  });

  it("renders the photo with a descriptive alt when image_url is set", () => {
    render(<VehicleCard vehicle={{ ...vehicle, image_url: "https://example.com/nexon.jpg" }} onPurchase={vi.fn()} />);

    expect(screen.getByRole("img", { name: "Tata Nexon" }).getAttribute("src")).toBe("https://example.com/nexon.jpg");
  });

  it("shows no management controls unless admin actions are passed", () => {
    render(<VehicleCard vehicle={vehicle} onPurchase={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /manage/i })).toBeNull();
  });

  it("shows the stock id as a small monospace tag", () => {
    render(<VehicleCard vehicle={{ ...vehicle, stock_id: "WD-00013" }} onPurchase={vi.fn()} />);

    const tag = screen.getByText("WD-00013");
    expect(tag.className).toContain("font-mono");
  });

  it("renders no stock tag when the vehicle has no stock id", () => {
    render(<VehicleCard vehicle={vehicle} onPurchase={vi.fn()} />);

    expect(screen.queryByText(/^WD-/)).toBeNull();
  });
});
