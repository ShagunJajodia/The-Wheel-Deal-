import { useState } from "react";
import type { ReactNode } from "react";

import type { Vehicle } from "../api/client";
import { formatINR } from "../lib/format";
import { DRIVETRAIN_LABELS, FUEL_LABELS } from "../lib/specs";
import { CarPlaceholder } from "./VehicleCard";
import type { VehicleCardAdmin } from "./VehicleCard";
import { Modal } from "./Modal";

type IconName =
  | "calendar"
  | "fuel"
  | "transmission"
  | "engine"
  | "power"
  | "torque"
  | "drivetrain"
  | "seats"
  | "mileage"
  | "colour"
  | "category"
  | "pin";

const ICON_PATHS: Record<IconName, ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
      <path d="M3 8.5h14M7 3v3M13 3v3" />
    </>
  ),
  fuel: (
    <>
      <path d="M4 17V4.5A1.5 1.5 0 0 1 5.5 3h5A1.5 1.5 0 0 1 12 4.5V17M3 17h10" />
      <path d="M12 8h1.5A1.5 1.5 0 0 1 15 9.5v4a1 1 0 0 0 2 0V7l-2-2" />
      <path d="M6 7h4" />
    </>
  ),
  transmission: (
    <>
      <circle cx="5.5" cy="4.5" r="1.5" />
      <circle cx="14.5" cy="4.5" r="1.5" />
      <circle cx="10" cy="15.5" r="1.5" />
      <path d="M5.5 6v4h9V6M10 10v4" />
    </>
  ),
  engine: (
    <>
      <path d="M3 8h2V6h4v2h3l2 2h2v4h-2l-1.5 2H7L5 14v-2H3z" />
      <path d="M8 3h4" />
    </>
  ),
  power: <path d="M11 2 4.5 11H9l-1 7 6.5-9H10z" />,
  torque: (
    <>
      <path d="M16.5 10A6.5 6.5 0 1 1 13.8 4.7" />
      <path d="M16.5 3v3.2h-3.2" />
    </>
  ),
  drivetrain: (
    <>
      <path d="M5 3.5v4M15 3.5v4M5 12.5v4M15 12.5v4" />
      <path d="M5 5.5h10M5 14.5h10M10 5.5v9" />
    </>
  ),
  seats: (
    <>
      <circle cx="10" cy="6" r="3" />
      <path d="M4 17c0-3.2 2.4-5 6-5s6 1.8 6 5" />
    </>
  ),
  mileage: (
    <>
      <path d="M3 14a7 7 0 0 1 14 0" />
      <path d="m10 14 3-4" />
      <circle cx="10" cy="14" r="0.75" fill="currentColor" />
    </>
  ),
  colour: <path d="M10 3s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9Z" />,
  category: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1.2" />
      <rect x="11" y="3" width="6" height="6" rx="1.2" />
      <rect x="3" y="11" width="6" height="6" rx="1.2" />
      <rect x="11" y="11" width="6" height="6" rx="1.2" />
    </>
  ),
  pin: (
    <>
      <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="10" cy="8" r="2.2" />
    </>
  ),
};

function SpecIcon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

interface Tile {
  icon: IconName;
  label: string;
  value: string;
}

function specTiles(vehicle: Vehicle): Tile[] {
  const electric = vehicle.fuel_type === "electric";
  const tiles: Array<Tile | null> = [
    { icon: "calendar", label: "Model year", value: String(vehicle.year) },
    vehicle.fuel_type ? { icon: "fuel", label: "Fuel", value: FUEL_LABELS[vehicle.fuel_type] } : null,
    vehicle.transmission ? { icon: "transmission", label: "Transmission", value: vehicle.transmission } : null,
    vehicle.engine
      ? { icon: "engine", label: electric ? "Battery & motor" : "Engine", value: vehicle.engine }
      : null,
    vehicle.power ? { icon: "power", label: "Power", value: vehicle.power } : null,
    vehicle.torque ? { icon: "torque", label: "Torque", value: vehicle.torque } : null,
    vehicle.drivetrain
      ? { icon: "drivetrain", label: "Drivetrain", value: DRIVETRAIN_LABELS[vehicle.drivetrain] }
      : null,
    vehicle.seats != null
      ? { icon: "seats", label: "Seating", value: `${vehicle.seats} ${vehicle.seats === 1 ? "seat" : "seats"}` }
      : null,
    vehicle.mileage
      ? { icon: "mileage", label: electric ? "Range" : "Mileage", value: vehicle.mileage }
      : null,
    vehicle.color ? { icon: "colour", label: "Colour", value: vehicle.color } : null,
    { icon: "category", label: "Category", value: vehicle.category.toUpperCase() },
    vehicle.location ? { icon: "pin", label: "Showroom", value: vehicle.location } : null,
  ];
  return tiles.filter((tile): tile is Tile => tile !== null);
}

const hasSpecs = (vehicle: Vehicle) =>
  [
    vehicle.fuel_type,
    vehicle.transmission,
    vehicle.engine,
    vehicle.power,
    vehicle.torque,
    vehicle.drivetrain,
    vehicle.seats,
    vehicle.mileage,
    vehicle.color,
    vehicle.location,
  ].some((value) => value != null && value !== "");

function StockState({ quantity }: { quantity: number }) {
  if (quantity === 0) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-stone-500">
        <span className="h-2 w-2 rounded-full bg-stone-400" aria-hidden="true" />
        Sold out
      </p>
    );
  }
  if (quantity <= 3) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
        <span>Only {quantity} left</span>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-stone-600">
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      {quantity} in stock
    </p>
  );
}

interface VehicleDetailDialogProps {
  vehicle: Vehicle;
  onClose: () => void;
  onPurchase: (id: number) => void;
  isPurchasing?: boolean;
  admin?: VehicleCardAdmin;
  /** The dashboard's purchase/admin notice, shown here because the page behind the sheet is covered. */
  notice?: ReactNode;
}

/** Full-height sheet on phones, wide dialog on desktop: photo, price, stock, description, spec grid, actions. */
export function VehicleDetailDialog({
  vehicle,
  onClose,
  onPurchase,
  isPurchasing = false,
  admin,
  notice,
}: VehicleDetailDialogProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const soldOut = vehicle.quantity === 0;
  const tiles = specTiles(vehicle);

  return (
    <Modal title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClose={onClose} variant="sheet">
      <div className="relative aspect-video overflow-hidden bg-stone-200 sm:rounded-t-2xl">
        {vehicle.image_url && !imageFailed ? (
          <img
            src={vehicle.image_url}
            alt={`${vehicle.make} ${vehicle.model}`}
            decoding="async"
            onError={() => setImageFailed(true)}
            className={`h-full w-full object-cover ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <CarPlaceholder />
        )}
        <span className="absolute bottom-3 left-3 rounded-full bg-showroom/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          {vehicle.category}
        </span>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-stone-500">
              {vehicle.year} · {vehicle.make}
            </p>
            {vehicle.stock_id && (
              <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-stone-600">
                {vehicle.stock_id}
              </span>
            )}
          </div>
          <h3 className="mt-0.5 break-words text-3xl font-extrabold leading-tight text-stone-950">{vehicle.model}</h3>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="text-3xl font-bold tabular-nums text-accent-ink">{formatINR(vehicle.price)}</p>
            <StockState quantity={vehicle.quantity} />
          </div>
          {vehicle.location && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-stone-600">
              <SpecIcon name="pin" className="h-4 w-4 shrink-0" />
              <span>{vehicle.location}</span>
            </p>
          )}
        </div>

        {vehicle.description && <p className="leading-relaxed text-stone-700">{vehicle.description}</p>}

        <section aria-labelledby={`specs-${vehicle.id}`}>
          <h4 id={`specs-${vehicle.id}`} className="font-display text-lg font-bold text-stone-950">
            Specifications
          </h4>
          {hasSpecs(vehicle) ? (
            <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
              {tiles.map((tile) => (
                <div key={tile.label} className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                  <dt className="flex items-center gap-2 text-xs font-medium text-stone-500">
                    <SpecIcon name={tile.icon} className="h-4 w-4 shrink-0 text-stone-500" />
                    {tile.label}
                  </dt>
                  <dd className="mt-1.5 break-words text-sm font-semibold text-stone-900">{tile.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-stone-500">Specifications coming soon.</p>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 space-y-3 border-t border-stone-200 bg-white p-4 sm:px-6">
        {notice}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={soldOut || isPurchasing}
            onClick={() => onPurchase(vehicle.id)}
            className="btn btn-primary flex-1 py-3 text-base sm:min-w-48 sm:flex-none sm:text-sm"
          >
            {soldOut ? "Sold out" : isPurchasing ? "Purchasing…" : "Purchase"}
          </button>
          {admin && (
            <>
              <button type="button" onClick={() => admin.onEdit(vehicle)} className="btn btn-secondary">
                Edit
              </button>
              <button type="button" onClick={() => admin.onRestock(vehicle)} className="btn btn-secondary">
                Restock
              </button>
              <button
                type="button"
                onClick={() => admin.onDelete(vehicle)}
                className="btn btn-secondary text-red-700 enabled:hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
