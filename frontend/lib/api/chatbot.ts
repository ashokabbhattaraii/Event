import apiClient from "./client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatbotResponse {
  intent: string;
  reply: string;
  // Context-aware follow-up chips rendered under the bot message — tapping
  // one sends it as the next question. Always computed fresh server-side.
  quickReplies?: string[];
}

export interface ChatbotSuggestionsResponse {
  suggestions: string[];
}

export interface AiHealthResponse {
  online: boolean;
  attendance: boolean;
  cf: boolean;
  intent: boolean;
}

export const chatbotApi = {
  query: async (
    message: string,
    eventId?: string,
    history: ChatMessage[] = []
  ): Promise<ChatbotResponse> => {
    const res = await apiClient.post("/chatbot/query", { message, eventId, history });
    return res.data;
  },
  suggestions: async (): Promise<ChatbotSuggestionsResponse> => {
    const res = await apiClient.get("/chatbot/suggestions");
    return res.data;
  },
  health: async (): Promise<AiHealthResponse> => {
    const res = await apiClient.get("/ai/health");
    return res.data;
  },
};