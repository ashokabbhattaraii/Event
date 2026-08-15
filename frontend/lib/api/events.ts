import apiClient from "./client";
import { toQueryString, type ListParams, type Pagination } from "./list";
import type { EventPrice } from "../price";

export interface EventListParams extends ListParams {
  status?: string;
  category?: string;
  type?: string;
}

export interface EventAgendaItem {
  time: string;
  title: string;
  description?: string;
}

export interface EventSpeaker {
  name: string;
  role?: string;
  bio?: string;
  photoUrl?: string;
}

export interface EventReminderSettings {
  enabled: boolean;
  offsets: number[];
  feedbackDelayHours: number;
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
  imageUrl?: string;
  tags?: string[];
  highlights?: string[];
  agenda?: EventAgendaItem[];
  speakers?: EventSpeaker[];
  requirements?: string;
  refundPolicy?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  reminderSettings?: EventReminderSettings;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  date: string;
  venue: string;
  coordinates?: { lat: number; lng: number };
  type: "In-person" | "Hybrid" | "Virtual";
  category: string;
  capacity: number;
  price?: number;
  status?: string;
  imageUrl?: string;
  tags?: string[];
  highlights?: string[];
  agenda?: EventAgendaItem[];
  speakers?: EventSpeaker[];
  requirements?: string;
  refundPolicy?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  reminderSettings?: EventReminderSettings;
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

  // Admin's own-tenant events (the public browse endpoint is org-agnostic).
  getOrg: async (params: EventListParams = {}): Promise<EventsResponse> => {
    const res = await apiClient.get(`/events/org${toQueryString(params)}`);
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
