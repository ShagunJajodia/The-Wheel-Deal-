import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/client";
import type { VehicleInput, VehicleUpdate } from "../api/client";

/**
 * Admin mutations. Each one refreshes every vehicles query when it settles, success or failure,
 * so a car deleted elsewhere (a 404) does not stay on screen.
 */
export function useVehicleMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicles"] });

  const create = useMutation({
    mutationFn: (vehicle: VehicleInput) => api.createVehicle(vehicle),
    onSettled: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: VehicleUpdate }) =>
      api.updateVehicle(id, changes),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.deleteVehicle(id),
    onSettled: refresh,
  });
  const restock = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      api.restockVehicle(id, quantity),
    onSettled: refresh,
  });

  return { create, update, remove, restock };
}
