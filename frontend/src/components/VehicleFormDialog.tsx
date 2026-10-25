import { useState } from "react";
import type { FormEvent } from "react";

import { ApiError, CATEGORIES } from "../api/client";
import type { Category, Vehicle, VehicleUpdate } from "../api/client";
import { useVehicleMutations } from "../hooks/useVehicleMutations";
import { mapValidationErrors } from "../lib/formErrors";
import { FormField } from "./FormField";
import { Modal } from "./Modal";

const FIELDS = [
  "make",
  "model",
  "year",
  "category",
  "price",
  "quantity",
  "image_url",
  "description",
] as const;
type Field = (typeof FIELDS)[number];
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

function initialValues(vehicle?: Vehicle): Values {
  return {
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    year: String(vehicle?.year ?? new Date().getFullYear()),
    category: vehicle?.category ?? "sedan",
    price: vehicle?.price ?? "",
    quantity: "0",
    image_url: vehicle?.image_url ?? "",
    description: vehicle?.description ?? "",
  };
}

function validate(values: Values, creating: boolean): Errors {
  const errors: Errors = {};
  if (!values.make.trim()) errors.make = "Enter the make.";
  if (!values.model.trim()) errors.model = "Enter the model.";
  const year = Number(values.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    errors.year = "Enter a year between 1900 and 2100.";
  }
  if (!/^\d+(\.\d{1,2})?$/.test(values.price.trim()) || Number(values.price) <= 0) {
    errors.price = "Enter a price above 0, with at most 2 decimals.";
  }
  if (creating) {
    const quantity = Number(values.quantity);
    if (values.quantity.trim() === "" || !Number.isInteger(quantity) || quantity < 0) {
      errors.quantity = "Enter a whole number, 0 or more.";
    }
  }
  return errors;
}

interface VehicleFormDialogProps {
  /** Present when editing; the quantity field is hidden because PUT cannot change stock. */
  vehicle?: Vehicle;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function VehicleFormDialog({ vehicle, onClose, onSaved }: VehicleFormDialogProps) {
  const editing = vehicle !== undefined;
  const { create, update } = useVehicleMutations();
  const [values, setValues] = useState<Values>(() => initialValues(vehicle));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending;

  function change(field: Field, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(values, !editing);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    // PUT accepts only these keys; anything else (quantity, id, timestamps) is a 422.
    const details: VehicleUpdate = {
      make: values.make.trim(),
      model: values.model.trim(),
      year: Number(values.year),
      category: values.category as Category,
      price: values.price.trim(),
      image_url: values.image_url.trim() || null,
      description: values.description.trim() || null,
    };
    const label = `${details.year} ${details.make} ${details.model}`;

    try {
      if (vehicle) {
        await update.mutateAsync({ id: vehicle.id, changes: details });
        onSaved(`Updated ${label}.`);
      } else {
        await create.mutateAsync({ ...details, quantity: Number(values.quantity) });
        onSaved(`Added ${label}.`);
      }
      onClose();
    } catch (error) {
      const mapped = mapValidationErrors(error, FIELDS);
      setErrors(mapped.fields);
      if (mapped.other.length > 0) {
        setFormError(mapped.other.join("; "));
      } else if (Object.keys(mapped.fields).length === 0) {
        setFormError(error instanceof ApiError ? error.message : "Could not save the vehicle. Try again.");
      }
    }
  }

  return (
    <Modal title={editing ? "Edit vehicle" : "Add vehicle"} onClose={busy ? () => undefined : onClose}>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Make" name="make" error={errors.make}>
            {(control) => (
              <input
                {...control}
                value={values.make}
                onChange={(event) => change("make", event.target.value)}
                autoComplete="off"
                autoFocus
                className="input"
              />
            )}
          </FormField>
          <FormField label="Model" name="model" error={errors.model}>
            {(control) => (
              <input
                {...control}
                value={values.model}
                onChange={(event) => change("model", event.target.value)}
                autoComplete="off"
                className="input"
              />
            )}
          </FormField>
          <FormField label="Year" name="year" error={errors.year}>
            {(control) => (
              <input
                {...control}
                type="number"
                inputMode="numeric"
                value={values.year}
                onChange={(event) => change("year", event.target.value)}
                className="input"
              />
            )}
          </FormField>
          <FormField label="Category" name="category" error={errors.category}>
            {(control) => (
              <select
                {...control}
                value={values.category}
                onChange={(event) => change("category", event.target.value)}
                className="input"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label="Price (₹)" name="price" error={errors.price}>
            {(control) => (
              <input
                {...control}
                inputMode="decimal"
                value={values.price}
                onChange={(event) => change("price", event.target.value)}
                placeholder="1250000"
                className="input"
              />
            )}
          </FormField>
          {!editing && (
            <FormField label="Quantity" name="quantity" error={errors.quantity} hint="Units in stock.">
              {(control) => (
                <input
                  {...control}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={values.quantity}
                  onChange={(event) => change("quantity", event.target.value)}
                  className="input"
                />
              )}
            </FormField>
          )}
        </div>
        <FormField label="Image URL" name="image_url" error={errors.image_url} hint="Optional.">
          {(control) => (
            <input
              {...control}
              type="url"
              value={values.image_url}
              onChange={(event) => change("image_url", event.target.value)}
              placeholder="https://"
              className="input"
            />
          )}
        </FormField>
        <FormField label="Description" name="description" error={errors.description} hint="Optional.">
          {(control) => (
            <textarea
              {...control}
              rows={3}
              value={values.description}
              onChange={(event) => change("description", event.target.value)}
              className="input"
            />
          )}
        </FormField>

        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary"
          >
            {busy ? "Saving…" : editing ? "Save changes" : "Add vehicle"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
