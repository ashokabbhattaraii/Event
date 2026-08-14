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

export interface AudienceSegments {
  totalAttendees: number;
  byInterestCategory: { category: string; count: number }[];
  byEngagement: { tier: string; count: number }[];
  checkInRate: number;
}

export interface MarketingInsight {
  hasEnoughData: boolean;
  suggestedSendWindow: string | null;
  topPerformingCategory: string | null;
  note: string;
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
  segments: async (): Promise<AudienceSegments> => {
    const res = await apiClient.get("/analytics/segments");
    return res.data;
  },
  marketingInsight: async (): Promise<MarketingInsight> => {
    const res = await apiClient.get("/analytics/marketing-insight");
    return res.data;
  },
};
