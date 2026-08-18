import apiClient from "./client";
import type { Pagination } from "./list";

// AI-driven collaboration suggestion between two organizations' events.
// Each organization's admin decides their side; when both accept, the two
// events become mutual co-hosts (see collaborationEngine.js).
export interface CollaborationSuggestion {
  _id: string;
  score: number;
  matchedFactors: { factor: string; detail: string; weight: number }[];
  rationale: string;
  rationaleSource: "ai" | "heuristic";
  statusA: "suggested" | "accepted" | "declined";
  statusB: "suggested" | "accepted" | "declined";
  resolvedAt?: string;
  resolvedOutcome?: "co-hosted" | "rejected";
  createdAt: string;
  eventA: {
    _id: string;
    title: string;
    date: string;
    venue: string;
    category: string;
    type: string;
    status: string;
    capacity: number;
    organization: string;
  };
  eventB: {
    _id: string;
    title: string;
    date: string;
    venue: string;
    category: string;
    type: string;
    status: string;
    capacity: number;
    organization: string;
  };
  orgA: { _id: string; name: string; city?: string; country?: string; status: string };
  orgB: { _id: string; name: string; city?: string; country?: string; status: string };
}

export interface CollaborationSuggestionsResponse {
  suggestions: CollaborationSuggestion[];
  pagination: Pagination;
}

export const collaborationApi = {
  list: async (): Promise<CollaborationSuggestionsResponse> => {
    const res = await apiClient.get("/collaboration");
    return res.data;
  },
  // Re-run the match scan for the caller's organization's events.
  generate: async (): Promise<{
    created: CollaborationSuggestion[];
    skipped: number;
    message: string;
  }> => {
    const res = await apiClient.post("/collaboration/generate");
    return res.data;
  },
  accept: async (id: string): Promise<{ suggestion: CollaborationSuggestion }> => {
    const res = await apiClient.post(`/collaboration/${id}/accept`);
    return res.data;
  },
  decline: async (id: string): Promise<{ suggestion: CollaborationSuggestion }> => {
    const res = await apiClient.post(`/collaboration/${id}/decline`);
    return res.data;
  },
};