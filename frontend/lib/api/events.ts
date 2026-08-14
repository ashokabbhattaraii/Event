import apiClient from "./client";
import { toQueryString, type ListParams, type Pagination } from "./list";
import type { EventPrice } from "../price";

export interface EventListParams extends ListParams {
  status?: string;
  category?: string;
  type?: string;
}

export interface EventData {
  _id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  coordinates?: { lat: number; lng: number };
  type: "In-person" | "Hybrid" | "Virtual";
  category: string;
  capacity: number;
  price: EventPrice;
  status: "Upcoming" | "Live" | "Past" | "Draft";
  organizer: { _id: string; name: string } | string;
  organization: string;
  registered: number;
  createdAt: string;
  predictedAttendance?: number;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  date: string;
  venue: string;
  type: "In-person" | "Hybrid" | "Virtual";
  category: string;
  capacity: number;
  price?: number;
  status?: string;
}

export interface EventsResponse {
  events: EventData[];
  pagination: Pagination;
}

export const eventsApi = {
  getAll: async (params: EventListParams = {}): Promise<EventsResponse> => {
    const res = await apiClient.get(`/events${toQueryString(params)}`);
    return res.data;
  },

  getMy: async (params: EventListParams = {}): Promise<EventsResponse> => {
    const res = await apiClient.get(`/events/my${toQueryString(params)}`);
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
