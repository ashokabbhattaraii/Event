// Admin AI training console API client (proxies the Python AI service via
// the backend's admin-only /api/ai routes).
import apiClient from "./client";

export interface AiModelMeta {
  trained: boolean;
  trainedAt?: string;
  samples?: number;
}

export interface AiHealth {
  online: boolean;
  attendance: boolean;
  cf: boolean;
  intent: boolean;
}

export interface AiStats {
  models: Record<string, AiModelMeta>;
  data: {
    events: number;
    pastEvents: number;
    upcomingEvents: number;
    tickets: number;
    chatlog: number;
  };
  intentDistribution: Record<string, number>;
}

export interface AiChatlogSample {
  id: string;
  message: string;
  intent: string;
  createdAt?: string | null;
}

export interface AiChatlogResponse {
  total: number;
  samples: AiChatlogSample[];
}

export interface AiStatusResponse {
  health: AiHealth;
  stats: AiStats | null;
}

export const aiApi = {
  status: async (): Promise<AiStatusResponse> => {
    const res = await apiClient.get("/ai/status");
    return res.data;
  },

  train: async (): Promise<Record<string, AiModelMeta>> => {
    const res = await apiClient.post("/ai/train");
    return res.data;
  },

  chatlog: async (params: {
    limit?: number;
    offset?: number;
    intent?: string;
    search?: string;
  } = {}): Promise<AiChatlogResponse> => {
    const res = await apiClient.get("/ai/chatlog", { params });
    return res.data;
  },

  patchChatlog: async (id: string, intent: string): Promise<{ ok: boolean }> => {
    const res = await apiClient.patch(`/ai/chatlog/${id}`, { intent });
    return res.data;
  },

  deleteChatlog: async (id: string): Promise<{ ok: boolean }> => {
    const res = await apiClient.delete(`/ai/chatlog/${id}`);
    return res.data;
  },

  classify: async (
    message: string
  ): Promise<{ intent: string | null; score: number | null }> => {
    const res = await apiClient.post("/ai/classify", { message });
    return res.data;
  },
};
