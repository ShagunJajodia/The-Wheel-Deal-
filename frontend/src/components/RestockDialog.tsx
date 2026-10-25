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
      <p className="mt-2 text-sm text-stone-600">Currently {vehicle.quantity} in stock.</p>
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
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={restock.isPending}
            className="btn btn-primary"
          >
            {restock.isPending ? "Restocking…" : "Restock"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
