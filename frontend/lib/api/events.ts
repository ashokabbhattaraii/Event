import apiClient from "./client";

export interface EventData {
  _id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  type: "In-person" | "Hybrid" | "Virtual";
  category: string;
  capacity: number;
  price: string;
  status: "Upcoming" | "Live" | "Past" | "Draft";
  organizer: { _id: string; name: string } | string;
  organization: string;
  registered: number;
  createdAt: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  date: string;
  venue: string;
  type: "In-person" | "Hybrid" | "Virtual";
  category: string;
  capacity: number;
  price?: string;
  status?: string;
}

export const eventsApi = {
  getAll: async (): Promise<{ events: EventData[] }> => {
    const res = await apiClient.get("/events");
    return res.data;
  },

  getMy: async (): Promise<{ events: EventData[] }> => {
    const res = await apiClient.get("/events/my");
    return res.data;
  },

  getById: async (id: string): Promise<{ event: EventData }> => {
    const res = await apiClient.get(`/events/${id}`);
    return res.data;
  },

  create: async (data: CreateEventPayload): Promise<{ event: EventData }> => {
    const res = await apiClient.post("/events", data);
    return res.data;
  },

  update: async (
    id: string,
    data: Partial<CreateEventPayload>
  ): Promise<{ event: EventData }> => {
    const res = await apiClient.put(`/events/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/events/${id}`);
    return res.data;
  },
};
