import apiClient from "./client";

export interface RegistrationTrendPoint {
  date: string;
  registrations: number;
}

export interface CategoryBreakdown {
  category: string;
  events: number;
  registered: number;
}

export interface OrganizerEventStat {
  _id: string;
  title: string;
  date: string;
  capacity: number;
  registered: number;
  fillRate: number;
  predictedAttendance: number;
}

export interface OrganizerAnalytics {
  trend: RegistrationTrendPoint[];
  categories: CategoryBreakdown[];
  events: OrganizerEventStat[];
}

export interface AdminAnalytics {
  totalEvents: number;
  totalTickets: number;
  checkedIn: number;
  checkInRate: number;
  trend: RegistrationTrendPoint[];
  categories: CategoryBreakdown[];
}

export const analyticsApi = {
  organizer: async (): Promise<OrganizerAnalytics> => {
    const res = await apiClient.get("/analytics/organizer");
    return res.data;
  },
  admin: async (): Promise<AdminAnalytics> => {
    const res = await apiClient.get("/analytics/admin");
    return res.data;
  },
};
