import apiClient from "./client";

export interface ChatbotResponse {
  intent: string;
  reply: string;
}

export const chatbotApi = {
  query: async (message: string, eventId?: string): Promise<ChatbotResponse> => {
    const res = await apiClient.post("/chatbot/query", { message, eventId });
    return res.data;
  },
};
