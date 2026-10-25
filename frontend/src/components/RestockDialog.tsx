import { useState } from "react";
import type { FormEvent } from "react";

import { ApiError } from "../api/client";
import type { Vehicle } from "../api/client";
import { useVehicleMutations } from "../hooks/useVehicleMutations";
import { mapValidationErrors } from "../lib/formErrors";
import { FormField } from "./FormField";
import { Modal } from "./Modal";

interface RestockDialogProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function RestockDialog({ vehicle, onClose, onSaved }: RestockDialogProps) {
  const { restock } = useVehicleMutations();
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const amount = Number(quantity);
    if (quantity.trim() === "" || !Number.isInteger(amount) || amount < 1) {
      setError("Enter a whole number of at least 1.");
      return;
    }
    setError(null);
    try {
      await restock.mutateAsync({ id: vehicle.id, quantity: amount });
      onSaved(`Added ${amount} to ${label}.`);
      onClose();
    } catch (failure) {
      const mapped = mapValidationErrors(failure, ["quantity"]);
      if (mapped.fields.quantity) setError(mapped.fields.quantity);
      else setFormError(failure instanceof ApiError ? failure.message : "Could not restock. Try again.");
    }
  }

  return (
    <Modal title={`Restock ${label}`} onClose={restock.isPending ? () => undefined : onClose}>
      <p className="mt-2 text-sm text-slate-600">Currently {vehicle.quantity} in stock.</p>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <FormField label="Quantity to add" name="quantity" error={error ?? undefined}>
          {(control) => (
            <input
              {...control}
              type="number"
              inputMode="numeric"
              min="1"
              autoFocus
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value);
                setError(null);
              }}
              className="input"
            />
          )}
        </FormField>
        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={restock.isPending}
            className="rounded-xl bg-slate-100 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={restock.isPending}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {restock.isPending ? "Restocking…" : "Restock"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
