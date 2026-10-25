import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, CATEGORIES, api } from "../api/client";
import type { Category, Vehicle, VehicleInput, VehicleUpdate } from "../api/client";

type FormState = Omit<VehicleInput, "price" | "quantity"> & { price: string; quantity: number };
const empty: FormState = { make: "", model: "", year: new Date().getFullYear(), category: "sedan", price: "", quantity: 0, image_url: null, description: null };

export function AdminPage() {
  const queryClient = useQueryClient();
  const vehicles = useQuery({ queryKey: ["vehicles", "admin"], queryFn: api.listVehicles });
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [restock, setRestock] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const change = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  function edit(vehicle: Vehicle) { setEditing(vehicle.id); setForm({ make: vehicle.make, model: vehicle.model, year: vehicle.year, category: vehicle.category, price: vehicle.price, quantity: vehicle.quantity, image_url: vehicle.image_url, description: vehicle.description }); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.make.trim() || !form.model.trim() || !/^\d+(\.\d{1,2})?$/.test(form.price) || Number(form.price) <= 0) { setMessage("Enter a make, model, and valid price."); return; }
    setBusy(true); setMessage("");
    try {
      const details: VehicleUpdate = { make: form.make.trim(), model: form.model.trim(), year: form.year, category: form.category, price: form.price, image_url: form.image_url || null, description: form.description || null };
      if (editing !== null) await api.updateVehicle(editing, details);
      else await api.createVehicle({ ...details, quantity: form.quantity });
      setMessage(editing !== null ? "Vehicle updated." : "Vehicle added."); setEditing(null); setForm(empty); await refresh();
    } catch (error) { setMessage(error instanceof ApiError ? error.message : "Could not save vehicle."); }
    finally { setBusy(false); }
  }

  async function remove(vehicle: Vehicle) {
    if (!window.confirm(`Delete ${vehicle.make} ${vehicle.model}?`)) return;
    try { await api.deleteVehicle(vehicle.id); setMessage("Vehicle deleted."); await refresh(); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Could not delete vehicle."); }
  }

  async function addStock(id: number) {
    const quantity = Number(restock[id]);
    if (!Number.isInteger(quantity) || quantity < 1) { setMessage("Restock quantity must be at least 1."); return; }
    try { await api.restockVehicle(id, quantity); setRestock((previous) => ({ ...previous, [id]: "" })); setMessage("Stock updated."); await refresh(); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Could not restock vehicle."); }
  }

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
    <h1 className="text-4xl font-black text-slate-950">Inventory manager</h1><p className="mt-2 text-slate-600">Add vehicles, edit details, and keep stock current.</p>
    <form onSubmit={save} className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{editing !== null ? "Edit vehicle" : "Add a vehicle"}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Make"><input required value={form.make} onChange={(e) => change("make", e.target.value)} className="input" /></Field>
        <Field label="Model"><input required value={form.model} onChange={(e) => change("model", e.target.value)} className="input" /></Field>
        <Field label="Year"><input required type="number" min="1900" max="2100" value={form.year} onChange={(e) => change("year", Number(e.target.value))} className="input" /></Field>
        <Field label="Category"><select value={form.category} onChange={(e) => change("category", e.target.value as Category)} className="input">{CATEGORIES.map((category) => <option key={category} value={category}>{category.toUpperCase()}</option>)}</select></Field>
        <Field label="Price (₹)"><input required type="text" inputMode="decimal" value={form.price} onChange={(e) => change("price", e.target.value)} className="input" /></Field>
        {editing === null && <Field label="Initial quantity"><input required type="number" min="0" value={form.quantity} onChange={(e) => change("quantity", Number(e.target.value))} className="input" /></Field>}
        <Field label="Image URL"><input type="url" value={form.image_url ?? ""} onChange={(e) => change("image_url", e.target.value)} className="input" /></Field>
        <Field label="Description"><input value={form.description ?? ""} onChange={(e) => change("description", e.target.value)} className="input" /></Field>
      </div>
      <div className="mt-6 flex gap-3"><button disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white disabled:opacity-60">{busy ? "Saving…" : editing !== null ? "Save changes" : "Add vehicle"}</button>{editing !== null && <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="rounded-xl bg-slate-100 px-5 py-2.5 font-semibold text-slate-700">Cancel</button>}</div>
    </form>
    {message && <p role="status" className="mt-5 rounded-xl bg-indigo-50 p-4 text-indigo-800">{message}</p>}
    <h2 className="mt-10 text-2xl font-bold">Vehicles</h2>
    {vehicles.isPending ? <p className="mt-5 text-slate-500">Loading inventory…</p> : vehicles.isError ? <button onClick={() => vehicles.refetch()} className="mt-5 rounded-xl bg-red-600 px-4 py-2 text-white">Could not load inventory. Retry</button> : <div className="mt-5 space-y-3">{vehicles.data.map((vehicle) => <article key={vehicle.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div><h3 className="font-bold text-slate-900">{vehicle.make} {vehicle.model} <span className="font-normal text-slate-500">· {vehicle.year}</span></h3><p className="text-sm text-slate-500">{vehicle.category.toUpperCase()} · {vehicle.quantity} in stock · ₹{Number(vehicle.price).toLocaleString("en-IN")}</p></div><div className="flex flex-wrap items-center gap-2"><input aria-label={`Restock ${vehicle.make} ${vehicle.model}`} type="number" min="1" placeholder="Qty" value={restock[vehicle.id] ?? ""} onChange={(e) => setRestock((previous) => ({ ...previous, [vehicle.id]: e.target.value }))} className="w-20 rounded-lg border border-slate-300 px-2 py-2" /><button onClick={() => addStock(vehicle.id)} className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">Restock</button><button onClick={() => edit(vehicle)} className="rounded-lg bg-indigo-50 px-3 py-2 font-semibold text-indigo-700">Edit</button><button onClick={() => remove(vehicle)} className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700">Delete</button></div></article>)}</div>}
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-semibold text-slate-700">{label}<div className="mt-2">{children}</div></label>; }
