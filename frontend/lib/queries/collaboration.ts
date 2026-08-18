import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collaborationApi } from "../api/collaboration";

export const collaborationKeys = {
  all: ["collaboration", "suggestions"] as const,
};

export function useCollaborationSuggestions() {
  return useQuery({
    queryKey: collaborationKeys.all,
    queryFn: collaborationApi.list,
    retry: false,
  });
}

// Re-run the AI match scan for the organization's events.
export function useGenerateSuggestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: collaborationApi.generate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.all });
    },
  });
}

export function useAcceptSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collaborationApi.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", "co-hosts"] });
    },
  });
}

export function useDeclineSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collaborationApi.decline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.all });
    },
  });
}