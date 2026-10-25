import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CATEGORIES } from "../api/client";
import { priceRangeError } from "../lib/filters";

interface FilterBarProps {
  /** Below md the filters live in a drawer; this opens it. Ignored from md up. */
  open?: boolean;
  onClose?: () => void;
}

export function FilterBar({ open = false, onClose = () => undefined }: FilterBarProps) {
  const [params, setParams] = useSearchParams();
  const urlMake = params.get("make") ?? "";
  const urlModel = params.get("model") ?? "";
  const urlMin = params.get("min_price") ?? "";
  const urlMax = params.get("max_price") ?? "";
  const [make, setMake] = useState(urlMake);
  const [model, setModel] = useState(urlModel);
  const [minPrice, setMinPrice] = useState(urlMin);
  const [maxPrice, setMaxPrice] = useState(urlMax);
  const rangeError = priceRangeError(minPrice, maxPrice);
  const rangeErrorId = useId();
  const pending = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const category = params.get("category");
  const hasFilters = ["make", "model", "category", "min_price", "max_price"].some((key) => params.get(key));

  useEffect(() => {
    if (!pending.current) return;
    const timer = window.setTimeout(() => {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of [["make", make], ["model", model], ["min_price", minPrice], ["max_price", maxPrice]]) {
          if (value.trim()) next.set(key, value.trim()); else next.delete(key);
        }
        return next;
      }, { replace: true });
      pending.current = false;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [make, model, minPrice, maxPrice, setParams]);

  // Pick up URL changes made elsewhere (for example "Clear filters") without fighting typing.
  useEffect(() => {
    if (pending.current) return;
    setMake((current) => (current.trim() === urlMake ? current : urlMake));
    setModel((current) => (current.trim() === urlModel ? current : urlModel));
    setMinPrice((current) => (current.trim() === urlMin ? current : urlMin));
    setMaxPrice((current) => (current.trim() === urlMax ? current : urlMax));
  }, [urlMake, urlModel, urlMin, urlMax]);

  // Drawer behaviour for small screens: scroll lock, Escape, focus, and auto-close at md+.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    const wide = typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 768px)") : null;
    const onWide = (event: MediaQueryListEvent) => {
      if (event.matches) onCloseRef.current();
    };
    wide?.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      wide?.removeEventListener("change", onWide);
    };
  }, [open]);

  function update(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  }

  function clearAll() {
    pending.current = false;
    setMake("");
    setModel("");
    setMinPrice("");
    setMaxPrice("");
    setParams({}, { replace: true });
  }

  const label = "block text-sm font-semibold text-stone-700";
  const panel = open
    ? "fixed inset-y-0 left-0 z-50 flex w-[88%] max-w-sm flex-col gap-5 overflow-y-auto bg-white p-5 shadow-2xl md:static md:z-auto md:block md:w-auto md:max-w-none md:overflow-visible md:rounded-2xl md:border md:border-stone-200 md:shadow-sm"
    : "hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:block";

  return (
    <>
      {open && <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-stone-950/55 md:hidden" />}
      <section aria-label="Vehicle filters" className={panel}>
        <div className="flex items-center justify-between md:hidden">
          <h2 className="text-xl font-bold text-stone-950">Filters</h2>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Close filters" className="-mr-2 rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <label className={label}>Make<input aria-label="Make" value={make} onChange={(event) => { pending.current = true; setMake(event.target.value); }} placeholder="e.g. Tata" className="input mt-1.5 font-normal" /></label>
          <label className={label}>Model<input aria-label="Model" value={model} onChange={(event) => { pending.current = true; setModel(event.target.value); }} placeholder="e.g. Nexon" className="input mt-1.5 font-normal" /></label>
          <label className={label}>Min price<input aria-label="Min price" type="number" inputMode="numeric" min="0" value={minPrice} onChange={(event) => { pending.current = true; setMinPrice(event.target.value); }} aria-invalid={rangeError ? "true" : undefined} aria-describedby={rangeError ? rangeErrorId : undefined} placeholder="₹ Min" className="input mt-1.5 font-normal" /></label>
          <label className={label}>Max price<input aria-label="Max price" type="number" inputMode="numeric" min="0" value={maxPrice} onChange={(event) => { pending.current = true; setMaxPrice(event.target.value); }} aria-invalid={rangeError ? "true" : undefined} aria-describedby={rangeError ? rangeErrorId : undefined} placeholder="₹ Max" className="input mt-1.5 font-normal" /></label>
          {rangeError && <p id={rangeErrorId} role="alert" className="text-sm text-red-600 md:col-span-4">{rangeError}</p>}
        </div>
        <div className="flex flex-wrap gap-2 md:mt-5" role="group" aria-label="Categories">
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => update("category", category === item ? "" : item)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${category === item ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"}`}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="mt-auto flex gap-3 md:hidden">
          <button type="button" onClick={clearAll} disabled={!hasFilters} className="btn btn-secondary flex-1">Clear all</button>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">Show results</button>
        </div>
      </section>
    </>
  );
}
