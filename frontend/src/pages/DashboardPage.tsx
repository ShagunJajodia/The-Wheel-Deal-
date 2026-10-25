import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { ApiError, api } from "../api/client";
import type { Vehicle, VehicleFilters } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FilterBar } from "../components/FilterBar";
import { RestockDialog } from "../components/RestockDialog";
import { VehicleCard } from "../components/VehicleCard";
import { VehicleDetailDialog } from "../components/VehicleDetailDialog";
import { VehicleFormDialog } from "../components/VehicleFormDialog";
import { useVehicleMutations } from "../hooks/useVehicleMutations";
import { priceRangeError } from "../lib/filters";

const keys = ["make", "model", "category", "min_price", "max_price"] as const;

type Dialog =
  | { kind: "add" }
  | { kind: "edit"; vehicle: Vehicle }
  | { kind: "restock"; vehicle: Vehicle }
  | { kind: "delete"; vehicle: Vehicle };

const carName = (vehicle: Vehicle) => `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

const gridClasses = "mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const filters: VehicleFilters = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  const filterKey = keys.map((key) => `${key}:${filters[key] ?? ""}`).join("|");
  const activeFilters = Object.keys(filters).length;
  const filtered = activeFilters > 0;
  const rangeInvalid = priceRangeError(filters.min_price ?? "", filters.max_price ?? "") !== null;
  const vehicles = useQuery({
    queryKey: ["vehicles", filterKey],
    queryFn: () => (filtered ? api.searchVehicles(filters) : api.listVehicles()),
    // An empty price range can only 422, so do not ask; keep the old grid while a new search loads.
    enabled: !rangeInvalid,
    placeholderData: keepPreviousData,
  });
  const queryClient = useQueryClient();
  // Every purchase in flight. The ref guards against two clicks in the same tick, before React re-renders.
  const [purchasing, setPurchasing] = useState<ReadonlySet<number>>(() => new Set());
  const purchasingRef = useRef(new Set<number>());
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersButton = useRef<HTMLButtonElement>(null);

  // The open car lives in the URL (?car=<id>) so it can be linked to and Back closes it.
  const carParam = params.get("car");
  const carId = carParam !== null && /^\d+$/.test(carParam) ? Number(carParam) : null;
  const openCar = carId === null ? undefined : vehicles.data?.find((vehicle) => vehicle.id === carId);

  function openSheet(vehicle: Vehicle) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("car", String(vehicle.id));
        return next;
      },
      { state: { sheet: true } },
    );
  }

  function closeSheet() {
    // A sheet we pushed is closed by going Back; one opened from a shared link has nothing to go back to.
    if ((location.state as { sheet?: boolean } | null)?.sheet) {
      navigate(-1);
      return;
    }
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("car");
        return next;
      },
      { replace: true },
    );
  }

  // A ?car= that matches nothing (deleted, wrong filter, junk) is dropped once the list has settled.
  const listSettled = vehicles.isSuccess && !vehicles.isPlaceholderData;
  useEffect(() => {
    if (carParam === null || (carId !== null && (!listSettled || openCar))) return;
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("car");
        return next;
      },
      { replace: true },
    );
  }, [carParam, carId, listSettled, openCar, setParams]);

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { remove } = useVehicleMutations();
  const closeDialog = () => {
    setDialog(null);
    remove.reset();
  };
  const saved = (message: string) => setNotice({ message, error: false });
  const closeFilters = () => {
    setFiltersOpen(false);
    filtersButton.current?.focus();
  };

  const clearFilters = () => setParams({}, { replace: true });

  async function purchase(id: number) {
    if (purchasingRef.current.has(id)) return;
    purchasingRef.current.add(id);
    setPurchasing(new Set(purchasingRef.current));
    try {
      await api.purchaseVehicle(id);
      setNotice({ message: "Purchase complete! Enjoy your new ride.", error: false });
    } catch (error) {
      setNotice({
        message:
          error instanceof ApiError && error.status === 409
            ? "This vehicle is out of stock now."
            : error instanceof ApiError
              ? error.message
              : "Purchase failed. Please try again.",
        error: true,
      });
    } finally {
      // Whatever happened (sold, sold out, deleted elsewhere), the list on screen may be stale.
      try {
        await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      } finally {
        purchasingRef.current.delete(id);
        setPurchasing(new Set(purchasingRef.current));
      }
    }
  }

  async function confirmDelete(vehicle: Vehicle) {
    try {
      await remove.mutateAsync(vehicle.id);
      saved(`Deleted ${carName(vehicle)}.`);
      closeDialog();
      if (carId === vehicle.id) closeSheet();
    } catch {
      // The failure stays visible inside the dialog through remove.error.
    }
  }

  const adminActions = isAdmin
    ? {
        onEdit: (vehicle: Vehicle) => setDialog({ kind: "edit", vehicle }),
        onRestock: (vehicle: Vehicle) => setDialog({ kind: "restock", vehicle }),
        onDelete: (vehicle: Vehicle) => setDialog({ kind: "delete", vehicle }),
      }
    : undefined;

  const noticeBlock = notice ? (
    <div
      role={notice.error ? "alert" : "status"}
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${notice.error ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200" : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"}`}
    >
      <span>{notice.message}</span>
      <button
        type="button"
        onClick={() => setNotice(null)}
        aria-label="Dismiss notification"
        className="-mr-1 rounded-lg p-1 text-lg leading-none hover:bg-black/5 dark:hover:bg-white/10"
      >
        ×
      </button>
    </div>
  ) : null;
  // The sheet gives way to an admin dialog (Esc would otherwise close both) and returns when it closes.
  const sheetVisible = openCar !== undefined && dialog === null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">The collection</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-[1.05] text-stone-950 sm:text-5xl dark:text-stone-50">Find your next ride.</h1>
        <p className="mt-3 text-stone-600 dark:text-stone-400">Explore the showroom, compare prices, and make your move.</p>
      </div>

      <FilterBar open={filtersOpen} onClose={closeFilters} />

      {!sheetVisible && noticeBlock && <div className="mt-6">{noticeBlock}</div>}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-bold text-stone-950 dark:text-stone-50">Available vehicles</h2>
          {vehicles.data && !rangeInvalid && (
            <span className="text-sm text-stone-500 dark:text-stone-400">
              {vehicles.data.length} result{vehicles.data.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            ref={filtersButton}
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-expanded={filtersOpen}
            className="btn btn-secondary md:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M3 5h14M6 10h8M8.5 15h3" />
            </svg>
            Filters
            {activeFilters > 0 && (
              <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs text-white dark:bg-stone-100 dark:text-stone-950">
                {activeFilters}
                <span className="sr-only"> active</span>
              </span>
            )}
          </button>
          {isAdmin && (
            <button type="button" onClick={() => setDialog({ kind: "add" })} className="btn btn-primary">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M10 4v12M4 10h12" />
              </svg>
              Add vehicle
            </button>
          )}
        </div>
      </div>

      {rangeInvalid ? (
        <div role="status" className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center sm:p-12 dark:border-stone-700 dark:bg-stone-900">
          <h3 className="text-xl font-bold text-stone-950 dark:text-stone-50">Check the price range</h3>
          <p className="mt-2 text-stone-600 dark:text-stone-400">Set a minimum at or below the maximum to see matching vehicles.</p>
          <button type="button" onClick={clearFilters} className="btn btn-primary mt-5">
            Clear filters
          </button>
        </div>
      ) : vehicles.isPending ? (
        <div className={gridClasses} aria-label="Loading vehicles" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900">
              <div className="aspect-[4/3] animate-pulse bg-stone-200 dark:bg-stone-800" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                <div className="h-6 w-2/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
              </div>
            </div>
          ))}
        </div>
      ) : vehicles.isError ? (
        <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center sm:p-10 dark:border-red-900 dark:bg-red-950">
          <h3 className="text-xl font-bold text-red-900 dark:text-red-100">Couldn't load vehicles</h3>
          <p className="mt-2 text-red-800 dark:text-red-200">{vehicles.error instanceof Error ? vehicles.error.message : "Please try again."}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {filtered && (
              <button type="button" onClick={clearFilters} className="btn btn-primary">
                Clear filters
              </button>
            )}
            {!(vehicles.error instanceof ApiError && vehicles.error.status < 500) && (
              <button type="button" onClick={() => vehicles.refetch()} className="btn btn-secondary">
                Retry
              </button>
            )}
          </div>
        </div>
      ) : vehicles.data.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center sm:p-12 dark:border-stone-700 dark:bg-stone-900">
          <svg viewBox="0 0 48 48" className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="21" cy="21" r="12" />
            <path d="M30 30l11 11" />
          </svg>
          <h3 className="mt-4 text-xl font-bold text-stone-950 dark:text-stone-50">No vehicles found</h3>
          <p className="mt-2 text-stone-600 dark:text-stone-400">Try a different search to find your fit.</p>
          {filtered && (
            <button type="button" onClick={clearFilters} className="btn btn-primary mt-5">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className={`${gridClasses} ${vehicles.isPlaceholderData ? "opacity-60 transition-opacity" : ""}`} aria-busy={vehicles.isPlaceholderData}>
          {vehicles.data.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onPurchase={purchase}
              isPurchasing={purchasing.has(vehicle.id)}
              admin={adminActions}
              onOpen={openSheet}
            />
          ))}
        </div>
      )}

      {sheetVisible && (
        <VehicleDetailDialog
          vehicle={openCar}
          onClose={closeSheet}
          onPurchase={purchase}
          isPurchasing={purchasing.has(openCar.id)}
          admin={adminActions}
          notice={noticeBlock}
        />
      )}
      {isAdmin && dialog?.kind === "add" && <VehicleFormDialog onClose={closeDialog} onSaved={saved} />}
      {isAdmin && dialog?.kind === "edit" && (
        <VehicleFormDialog vehicle={dialog.vehicle} onClose={closeDialog} onSaved={saved} />
      )}
      {isAdmin && dialog?.kind === "restock" && (
        <RestockDialog vehicle={dialog.vehicle} onClose={closeDialog} onSaved={saved} />
      )}
      {isAdmin && dialog?.kind === "delete" && (
        <ConfirmDialog
          title={`Delete ${carName(dialog.vehicle)}?`}
          message="This removes the vehicle from the inventory. It cannot be undone."
          confirmLabel="Delete"
          busy={remove.isPending}
          error={
            remove.error
              ? remove.error instanceof ApiError
                ? remove.error.message
                : "Could not delete the vehicle."
              : null
          }
          onConfirm={() => confirmDelete(dialog.vehicle)}
          onCancel={closeDialog}
        />
      )}
    </main>
  );
}
