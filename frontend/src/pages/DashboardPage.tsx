import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { ApiError, api } from "../api/client";
import type { Vehicle, VehicleFilters } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FilterBar } from "../components/FilterBar";
import { RestockDialog } from "../components/RestockDialog";
import { VehicleCard } from "../components/VehicleCard";
import { VehicleFormDialog } from "../components/VehicleFormDialog";
import { useVehicleMutations } from "../hooks/useVehicleMutations";

const keys = ["make", "model", "category", "min_price", "max_price"] as const;

type Dialog =
  | { kind: "add" }
  | { kind: "edit"; vehicle: Vehicle }
  | { kind: "restock"; vehicle: Vehicle }
  | { kind: "delete"; vehicle: Vehicle };

const carName = (vehicle: Vehicle) => `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const filters: VehicleFilters = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  const filterKey = keys.map((key) => `${key}:${filters[key] ?? ""}`).join("|");
  const filtered = Object.keys(filters).length > 0;
  const vehicles = useQuery({ queryKey: ["vehicles", filterKey], queryFn: () => filtered ? api.searchVehicles(filters) : api.listVehicles() });
  const queryClient = useQueryClient();
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { remove } = useVehicleMutations();
  const closeDialog = () => { setDialog(null); remove.reset(); };
  const saved = (message: string) => setNotice({ message, error: false });

  async function confirmDelete(vehicle: Vehicle) {
    try {
      await remove.mutateAsync(vehicle.id);
      saved(`Deleted ${carName(vehicle)}.`);
      closeDialog();
    } catch { /* the error stays visible in the dialog via remove.error */ }
  }
  const adminActions = isAdmin
    ? {
        onEdit: (vehicle: Vehicle) => setDialog({ kind: "edit", vehicle }),
        onRestock: (vehicle: Vehicle) => setDialog({ kind: "restock", vehicle }),
        onDelete: (vehicle: Vehicle) => setDialog({ kind: "delete", vehicle }),
      }
    : undefined;

  async function purchase(id: number) {
    setPurchasing(id);
    try {
      await api.purchaseVehicle(id);
      setNotice({ message: "Purchase complete! Enjoy your new ride.", error: false });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (error) {
      setNotice({ message: error instanceof ApiError && error.status === 409 ? "This vehicle is out of stock now." : error instanceof ApiError ? error.message : "Purchase failed. Please try again.", error: true });
      if (error instanceof ApiError && error.status === 409) await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } finally { setPurchasing(null); }
  }

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
    <div className="mb-8"><p className="text-sm font-bold uppercase tracking-[.2em] text-indigo-600">Discover your drive</p><h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Find your next ride.</h1><p className="mt-3 text-slate-600">Explore the collection, compare prices, and make your move.</p></div>
    <FilterBar />
    {notice && <div role="status" className={`mt-6 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium ${notice.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{notice.message}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="ml-3 text-lg">×</button></div>}
    <div className="mt-9 flex items-center justify-between gap-4"><h2 className="text-2xl font-bold text-slate-900">Available vehicles</h2><div className="flex items-center gap-4">{vehicles.data && <span className="text-sm text-slate-500">{vehicles.data.length} result{vehicles.data.length === 1 ? "" : "s"}</span>}{isAdmin && <button type="button" onClick={() => setDialog({ kind: "add" })} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Add vehicle</button>}</div></div>
    {vehicles.isPending ? <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading vehicles">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-96 animate-pulse rounded-3xl bg-slate-200" />)}</div>
    : vehicles.isError ? <div role="alert" className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-10 text-center"><h3 className="text-xl font-bold text-red-800">Couldn't load vehicles</h3><p className="mt-2 text-red-700">{vehicles.error instanceof Error ? vehicles.error.message : "Please try again."}</p><button type="button" onClick={() => vehicles.refetch()} className="mt-5 rounded-xl bg-red-700 px-5 py-2.5 font-semibold text-white">Retry</button></div>
    : vehicles.data.length === 0 ? <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center"><div className="text-5xl">🚗</div><h3 className="mt-4 text-xl font-bold text-slate-900">No vehicles found</h3><p className="mt-2 text-slate-500">Try a different search to find your fit.</p>{filtered && <button type="button" onClick={() => setParams({})} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white">Clear filters</button>}</div>
    : <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{vehicles.data.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} onPurchase={purchase} isPurchasing={purchasing === vehicle.id} admin={adminActions} />)}</div>}
    {isAdmin && dialog?.kind === "add" && <VehicleFormDialog onClose={closeDialog} onSaved={saved} />}
    {isAdmin && dialog?.kind === "edit" && <VehicleFormDialog vehicle={dialog.vehicle} onClose={closeDialog} onSaved={saved} />}
    {isAdmin && dialog?.kind === "restock" && <RestockDialog vehicle={dialog.vehicle} onClose={closeDialog} onSaved={saved} />}
    {isAdmin && dialog?.kind === "delete" && <ConfirmDialog title={`Delete ${carName(dialog.vehicle)}?`} message="This removes the vehicle from the inventory. It cannot be undone." confirmLabel="Delete" busy={remove.isPending} error={remove.error ? (remove.error instanceof ApiError ? remove.error.message : "Could not delete the vehicle.") : null} onConfirm={() => confirmDelete(dialog.vehicle)} onCancel={closeDialog} />}
  </main>;
}
