import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError, api } from "../api/client";
import { Modal } from "../components/Modal";
import { formatINR } from "../lib/format";
import { lineProblem, useCart } from "./CartContext";
import type { CartLine } from "./CartContext";

function Thumb({ line }: { line: CartLine }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-200">
      {line.image_url && !failed ? (
        <img
          src={line.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-linear-to-br from-stone-200 to-stone-300 text-stone-400">
          <svg viewBox="0 0 240 120" className="w-3/5" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M30 88V70c0-6 4-9 10-10l24-5 20-19c3-3 7-4 12-4h46c6 0 10 2 14 6l18 17 28 5c6 1 10 5 10 11v17H30z" />
            <circle cx="74" cy="90" r="12" />
            <circle cx="168" cy="90" r="12" />
          </svg>
        </div>
      )}
    </div>
  );
}

const stepButton =
  "grid h-9 w-9 place-items-center rounded-lg border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400";

function Line({ line, busy }: { line: CartLine; busy: boolean }) {
  const { setQuantity, remove } = useCart();
  const name = `${line.year} ${line.make} ${line.model}`;
  const problem = lineProblem(line);
  return (
    <li className="flex gap-3 py-4">
      <Thumb line={line} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug text-stone-950">{name}</p>
        <p className="mt-0.5 text-sm tabular-nums text-accent-ink">{formatINR(line.price)}</p>
        {problem && (
          <p className="mt-1 text-sm font-semibold text-red-700">
            {problem === "soldOut" ? "Sold out" : `Only ${line.stock} left`}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            disabled={busy || line.quantity <= 1}
            onClick={() => setQuantity(line.vehicleId, line.quantity - 1)}
            aria-label={`Decrease quantity of ${name}`}
            className={stepButton}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 10h12" />
            </svg>
          </button>
          <span className="min-w-8 text-center font-semibold tabular-nums" aria-label={`Quantity ${line.quantity}`}>
            {line.quantity}
          </span>
          <button
            type="button"
            disabled={busy || line.quantity >= line.stock}
            onClick={() => setQuantity(line.vehicleId, line.quantity + 1)}
            aria-label={`Increase quantity of ${name}`}
            className={stepButton}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M10 4v12M4 10h12" />
            </svg>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => remove(line.vehicleId)}
            aria-label={`Remove ${name}`}
            className="ml-auto rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-red-700 disabled:cursor-not-allowed disabled:text-stone-300"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}

/** Mounted only while open, so a closed drawer forgets any old checkout error. */
export function CartDrawer({ onOrdered }: { onOrdered: (cars: number) => void }) {
  const { isOpen } = useCart();
  return isOpen ? <DrawerBody onOrdered={onOrdered} /> : null;
}

function DrawerBody({ onOrdered }: { onOrdered: (cars: number) => void }) {
  const { lines, count, subtotal, closeCart, clear } = useCart();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = lines.some((line) => lineProblem(line) !== null);

  async function checkout() {
    if (busyRef.current || lines.length === 0 || blocked) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const ordered = count;
    try {
      await api.checkout(lines.map((line) => ({ vehicle_id: line.vehicleId, quantity: line.quantity })));
      clear();
      closeCart();
      onOrdered(ordered);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Checkout failed. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
      // Sold, short or deleted: either way the stock on screen is now out of date.
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    }
  }

  return (
    <Modal
      title="Your cart"
      placement="drawer"
      onClose={() => {
        if (!busy) closeCart();
      }}
    >
      {lines.length === 0 ? (
        <div className="grid flex-1 place-items-center text-center">
          <div>
            <svg viewBox="0 0 48 48" className="mx-auto h-12 w-12 text-stone-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8h6l5 22h20l4-16H14" />
              <circle cx="20" cy="39" r="2.5" />
              <circle cx="34" cy="39" r="2.5" />
            </svg>
            <p className="mt-3 text-lg font-bold text-stone-950">Your cart is empty</p>
            <p className="mt-1 text-stone-600">Add a car from the showroom to get started.</p>
            <button type="button" onClick={closeCart} className="btn btn-secondary mt-5">
              Keep browsing
            </button>
          </div>
        </div>
      ) : (
        <>
          <ul className="-mx-1 mt-4 min-h-0 flex-1 divide-y divide-stone-200 overflow-y-auto px-1">
            {lines.map((line) => (
              <Line key={line.vehicleId} line={line} busy={busy} />
            ))}
          </ul>
          <div className="mt-4 border-t border-stone-200 pt-4">
            {error && (
              <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {error}
              </p>
            )}
            {blocked && !error && (
              <p className="mb-3 text-sm text-red-700">Some cars are low on stock. Lower the quantity or remove them to check out.</p>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-stone-600">Subtotal</span>
              <span className="text-2xl font-bold tabular-nums text-accent-ink">{formatINR(subtotal)}</span>
            </div>
            <button
              type="button"
              disabled={busy || blocked}
              onClick={checkout}
              aria-busy={busy}
              className="btn btn-primary mt-4 w-full py-3 text-base sm:text-sm"
            >
              Checkout
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
