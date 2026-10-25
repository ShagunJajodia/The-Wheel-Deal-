import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/client";
import type { VehicleInput, VehicleUpdate } from "../api/client";

/** Admin mutations. Each one refreshes every vehicles query before it settles. */
export function useVehicleMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicles"] });

  const create = useMutation({
    mutationFn: (vehicle: VehicleInput) => api.createVehicle(vehicle),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: VehicleUpdate }) =>
      api.updateVehicle(id, changes),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.deleteVehicle(id),
    onSuccess: refresh,
  });
  const restock = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      api.restockVehicle(id, quantity),
    onSuccess: refresh,
  });

  return { create, update, remove, restock };
}
