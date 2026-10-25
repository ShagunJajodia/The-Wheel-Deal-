import type { Vehicle } from "../api/client";
import { CardMenu } from "./CardMenu";

const fallbacks: Record<Vehicle["category"], string> = {
  sedan: "🚘", suv: "🚙", hatchback: "🚗", coupe: "🏎️", convertible: "🏎️", truck: "🛻", van: "🚐", ev: "⚡",
};

export interface VehicleCardAdmin {
  onEdit: (vehicle: Vehicle) => void;
  onRestock: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

export function VehicleCard({ vehicle, onPurchase, isPurchasing = false, admin }: {
  vehicle: Vehicle;
  onPurchase: (id: number) => void;
  isPurchasing?: boolean;
  /** Pass only for admins; omitting it renders no management controls. */
  admin?: VehicleCardAdmin;
}) {
  const price = Number(vehicle.price);
  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-7xl">
        {vehicle.image_url ? <img src={vehicle.image_url} alt={`${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover" /> : <span aria-hidden="true">{fallbacks[vehicle.category]}</span>}
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">{vehicle.category}</span>
        {admin && (
          <div className="absolute right-3 top-3">
            <CardMenu
              label={label}
              onEdit={() => admin.onEdit(vehicle)}
              onRestock={() => admin.onRestock(vehicle)}
              onDelete={() => admin.onDelete(vehicle)}
            />
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="text-sm font-medium text-slate-500">{vehicle.year} · {vehicle.make}</p>
        <h3 className="mt-1 text-xl font-bold text-slate-950">{vehicle.model}</h3>
        <p className="mt-3 text-2xl font-extrabold text-slate-900">{Number.isFinite(price) ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(price) : vehicle.price}</p>
        <div className="mt-3 min-h-6 text-sm font-medium text-slate-600">
          {vehicle.quantity === 0 ? "Out of stock" : vehicle.quantity <= 3 ? <span className="text-amber-700">Only {vehicle.quantity} left</span> : `${vehicle.quantity} in stock`}
        </div>
        <button type="button" disabled={vehicle.quantity === 0 || isPurchasing} onClick={() => onPurchase(vehicle.id)} className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
          {vehicle.quantity === 0 ? "Sold out" : isPurchasing ? "Purchasing…" : "Purchase"}
        </button>
      </div>
    </article>
  );
}
