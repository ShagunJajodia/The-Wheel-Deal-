import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CATEGORIES } from "../api/client";

export function FilterBar() {
  const [params, setParams] = useSearchParams();
  const [make, setMake] = useState(params.get("make") ?? "");
  const [model, setModel] = useState(params.get("model") ?? "");
  const pending = useRef(false);
  const category = params.get("category");

  useEffect(() => {
    if (!pending.current) return;
    const timer = window.setTimeout(() => {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of [["make", make], ["model", model]]) {
          if (value.trim()) next.set(key, value.trim()); else next.delete(key);
        }
        return next;
      }, { replace: true });
      pending.current = false;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [make, model, setParams]);

  function update(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  }

  return <section aria-label="Vehicle filters" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="grid gap-4 md:grid-cols-4">
      <label className="text-sm font-semibold text-slate-700">Make<input aria-label="Make" value={make} onChange={(event) => { pending.current = true; setMake(event.target.value); }} placeholder="e.g. Tata" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500" /></label>
      <label className="text-sm font-semibold text-slate-700">Model<input aria-label="Model" value={model} onChange={(event) => { pending.current = true; setModel(event.target.value); }} placeholder="e.g. Nexon" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500" /></label>
      <label className="text-sm font-semibold text-slate-700">Min price<input aria-label="Min price" type="number" min="0" value={params.get("min_price") ?? ""} onChange={(event) => update("min_price", event.target.value)} placeholder="₹ Min" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500" /></label>
      <label className="text-sm font-semibold text-slate-700">Max price<input aria-label="Max price" type="number" min="0" value={params.get("max_price") ?? ""} onChange={(event) => update("max_price", event.target.value)} placeholder="₹ Max" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500" /></label>
    </div>
    <div className="mt-5 flex flex-wrap gap-2" aria-label="Categories">
      {CATEGORIES.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => update("category", category === item ? "" : item)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${category === item ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item.toUpperCase()}</button>)}
    </div>
  </section>;
}
