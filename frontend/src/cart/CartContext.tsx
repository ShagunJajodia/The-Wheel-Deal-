import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Vehicle } from "../api/client";

/** The API accepts at most 20 distinct cars per checkout. */
export const MAX_CART_LINES = 20;

export interface CartLine {
  vehicleId: number;
  quantity: number;
  make: string;
  model: string;
  year: number;
  price: string;
  image_url: string | null;
  /** Latest stock we have seen for this car; the stepper cannot go above it. */
  stock: number;
}

interface CartState {
  lines: CartLine[];
  /** Total units across all lines. */
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  quantityOf: (vehicleId: number) => number;
  canAdd: (vehicle: Vehicle) => boolean;
  add: (vehicle: Vehicle) => void;
  setQuantity: (vehicleId: number, quantity: number) => void;
  remove: (vehicleId: number) => void;
  clear: () => void;
  /** Refresh price and stock snapshots from freshly fetched vehicles. */
  syncVehicles: (vehicles: Vehicle[]) => void;
}

const noop = () => {};

/** Used when no provider is mounted (tests, public pages): an always-empty cart. */
const inertCart: CartState = {
  lines: [],
  count: 0,
  subtotal: 0,
  isOpen: false,
  openCart: noop,
  closeCart: noop,
  quantityOf: () => 0,
  canAdd: () => false,
  add: noop,
  setQuantity: noop,
  remove: noop,
  clear: noop,
  syncVehicles: noop,
};

const CartContext = createContext<CartState>(inertCart);

export const cartStorageKey = (userId: number) => `wheel-deal-cart:${userId}`;

function isLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    Number.isInteger(line.vehicleId) &&
    Number.isInteger(line.quantity) &&
    (line.quantity as number) >= 1 &&
    typeof line.make === "string" &&
    typeof line.model === "string" &&
    typeof line.year === "number" &&
    typeof line.price === "string" &&
    (line.image_url === null || typeof line.image_url === "string") &&
    typeof line.stock === "number"
  );
}

function load(userId: number | null): CartLine[] {
  if (userId === null) return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(cartStorageKey(userId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isLine).slice(0, MAX_CART_LINES) : [];
  } catch {
    return [];
  }
}

function save(userId: number | null, lines: CartLine[]) {
  if (userId === null) return;
  try {
    if (lines.length === 0) localStorage.removeItem(cartStorageKey(userId));
    else localStorage.setItem(cartStorageKey(userId), JSON.stringify(lines));
  } catch {
    // Storage can be full or blocked; the cart still works for this page view.
  }
}

/** One cart per signed-in user. Mount it with key={userId} so a different account starts fresh. */
export function CartProvider({ userId, children }: { userId: number | null; children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => load(userId));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    save(userId, lines);
  }, [userId, lines]);

  const add = useCallback((vehicle: Vehicle) => {
    setLines((current) => {
      const existing = current.find((line) => line.vehicleId === vehicle.id);
      if (existing) {
        if (existing.quantity >= vehicle.quantity) return current;
        return current.map((line) =>
          line.vehicleId === vehicle.id ? { ...line, quantity: line.quantity + 1, stock: vehicle.quantity } : line,
        );
      }
      if (vehicle.quantity < 1 || current.length >= MAX_CART_LINES) return current;
      return [
        ...current,
        {
          vehicleId: vehicle.id,
          quantity: 1,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          price: vehicle.price,
          image_url: vehicle.image_url,
          stock: vehicle.quantity,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((vehicleId: number, quantity: number) => {
    setLines((current) =>
      current.map((line) =>
        line.vehicleId === vehicleId ? { ...line, quantity: Math.max(1, Math.min(quantity, Math.max(line.stock, 1))) } : line,
      ),
    );
  }, []);

  const remove = useCallback((vehicleId: number) => {
    setLines((current) => current.filter((line) => line.vehicleId !== vehicleId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const syncVehicles = useCallback((vehicles: Vehicle[]) => {
    setLines((current) => {
      let changed = false;
      const next = current.map((line) => {
        const fresh = vehicles.find((vehicle) => vehicle.id === line.vehicleId);
        if (!fresh) return line;
        if (
          fresh.quantity === line.stock &&
          fresh.price === line.price &&
          fresh.image_url === line.image_url &&
          fresh.make === line.make &&
          fresh.model === line.model &&
          fresh.year === line.year
        ) {
          return line;
        }
        changed = true;
        return {
          ...line,
          stock: fresh.quantity,
          price: fresh.price,
          image_url: fresh.image_url,
          make: fresh.make,
          model: fresh.model,
          year: fresh.year,
        };
      });
      return changed ? next : current;
    });
  }, []);

  const value = useMemo<CartState>(() => {
    const quantityOf = (vehicleId: number) => lines.find((line) => line.vehicleId === vehicleId)?.quantity ?? 0;
    return {
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      quantityOf,
      canAdd: (vehicle) => {
        const inCart = quantityOf(vehicle.id);
        if (inCart > 0) return inCart < vehicle.quantity;
        return vehicle.quantity > 0 && lines.length < MAX_CART_LINES;
      },
      add,
      setQuantity,
      remove,
      clear,
      syncVehicles,
    };
  }, [lines, isOpen, add, setQuantity, remove, clear, syncVehicles]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  return useContext(CartContext);
}

/** What is wrong with a line given the latest known stock, if anything. */
export function lineProblem(line: CartLine): "soldOut" | "short" | null {
  if (line.stock <= 0) return "soldOut";
  if (line.quantity > line.stock) return "short";
  return null;
}
