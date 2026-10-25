import { useState } from "react";

import type { Vehicle } from "../api/client";
import { formatINR } from "../lib/format";
import { CardMenu } from "./CardMenu";

export interface VehicleCardAdmin {
  onEdit: (vehicle: Vehicle) => void;
  onRestock: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

/** Quiet line-art placeholder for vehicles without a photo. */
export function CarPlaceholder() {
  return (
    <div className="grid h-full w-full place-items-center bg-linear-to-br from-stone-200 via-stone-100 to-stone-300 text-stone-400 dark:from-stone-800 dark:via-stone-900 dark:to-stone-800 dark:text-stone-600">
      <svg viewBox="0 0 240 120" className="w-3/5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="120" cy="104" rx="92" ry="5" fill="currentColor" stroke="none" opacity="0.25" />
        <path d="M30 88V70c0-6 4-9 10-10l24-5 20-19c3-3 7-4 12-4h46c6 0 10 2 14 6l18 17 28 5c6 1 10 5 10 11v17" />
        <path d="M30 88h26M92 88h56M184 88h28" />
        <path d="M90 38h48l18 17H70z" opacity="0.7" />
        <circle cx="74" cy="88" r="15" className="fill-stone-200 dark:fill-stone-800" />
        <circle cx="74" cy="88" r="5" fill="currentColor" stroke="none" />
        <circle cx="168" cy="88" r="15" className="fill-stone-200 dark:fill-stone-800" />
        <circle cx="168" cy="88" r="5" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

function StockLine({ quantity }: { quantity: number }) {
  if (quantity === 0) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-stone-500 dark:text-stone-400">
        <span className="h-2 w-2 rounded-full bg-stone-400" aria-hidden="true" />
        Out of stock
      </p>
    );
  }
  if (quantity <= 3) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
        <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
        <span>Only {quantity} left</span>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-400">
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      {quantity} in stock
    </p>
  );
}

export function VehicleCard({
  vehicle,
  onPurchase,
  isPurchasing = false,
  admin,
  onOpen,
}: {
  vehicle: Vehicle;
  onPurchase: (id: number) => void;
  /** Opens the detail sheet. Fires for a click anywhere on the card except Purchase and the admin menu. */
  onOpen?: (vehicle: Vehicle) => void;
  isPurchasing?: boolean;
  /** Pass only for admins; omitting it renders no management controls. */
  admin?: VehicleCardAdmin;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const soldOut = vehicle.quantity === 0;
  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <article
      onClick={onOpen ? () => onOpen(vehicle) : undefined}
      className={`relative flex flex-col rounded-2xl border border-stone-200 bg-stone-50 shadow-sm transition duration-200 hover:border-stone-300 hover:shadow-lg dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700 motion-safe:hover:-translate-y-1 ${onOpen ? "cursor-pointer" : ""}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-stone-200 dark:bg-stone-800">
        {vehicle.image_url && !imageFailed ? (
          <img
            src={vehicle.image_url}
            alt={`${vehicle.make} ${vehicle.model}`}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className={`h-full w-full object-cover ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <CarPlaceholder />
        )}
        {soldOut && (
          <div aria-hidden="true" className="absolute inset-0 grid place-items-center bg-stone-950/55">
            <span className="rounded-full border border-white/70 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-white">
              Sold out
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-showroom/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          {vehicle.category}
        </span>
      </div>
      {admin && (
        <div className="absolute right-3 top-3 z-10" onClick={(event) => event.stopPropagation()}>
          <CardMenu
            label={label}
            onEdit={() => admin.onEdit(vehicle)}
            onRestock={() => admin.onRestock(vehicle)}
            onDelete={() => admin.onDelete(vehicle)}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
            {vehicle.year} · {vehicle.make}
          </p>
          {vehicle.stock_id && (
            <span className="rounded bg-stone-200 px-1.5 py-0.5 font-mono text-[11px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {vehicle.stock_id}
            </span>
          )}
        </div>
        <h3 className="mt-0.5 text-xl font-bold leading-tight text-stone-950 dark:text-stone-50">
          {/* A real button so keyboard users can open the card; a click on it bubbles to the article. */}
          <button type="button" aria-label={`View ${label}`} className="rounded text-left">
            {vehicle.model}
          </button>
        </h3>
        <p className="mt-3 text-2xl font-bold tabular-nums text-accent-ink dark:text-amber-400">{formatINR(vehicle.price)}</p>
        <div className="mb-4 mt-2 min-h-6">
          <StockLine quantity={vehicle.quantity} />
        </div>
        <button
          type="button"
          disabled={soldOut || isPurchasing}
          onClick={(event) => {
            event.stopPropagation();
            onPurchase(vehicle.id);
          }}
          className="btn btn-primary mt-auto w-full py-3 text-base sm:text-sm"
        >
          {soldOut ? "Sold out" : isPurchasing ? "Purchasing…" : "Purchase"}
        </button>
      </div>
    </article>
  );
}
