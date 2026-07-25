import { useMutation, useQueryClient } from "@tanstack/react-query";
import { captureAndSaveLocation, locationApi } from "../api/location";
import { recommendationKeys } from "./recommendations";

/**
 * Captures the browser location and saves it, then refreshes anything that
 * depends on location (recommendations). Use for a manual "update my location"
 * button on the recommendations page.
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const location = await captureAndSaveLocation();
      if (!location) throw new Error("Location unavailable or permission denied");
      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recommendationKeys.list });
    },
  });
}

/** Save an already-known set of coordinates (no browser prompt). */
export function useSaveLocationCoords() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (coords: { lat: number; lng: number; city?: string }) =>
      locationApi.update(coords),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recommendationKeys.list });
    },
  });
}
