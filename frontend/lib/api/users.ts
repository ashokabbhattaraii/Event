import apiClient from "./client";
import { toQueryString, type ListParams, type Pagination } from "./list";

export interface UserListParams extends ListParams {
  role?: string;
  // System admin (admin w/o org) passes organizationId to view another
  // tenant; org admins always see their own tenant.
  organizationId?: string;
}

export interface OrgUser {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "organizer" | "attendee";
  organization: string;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: "admin" | "organizer" | "attendee";
  // The system admin (platform view) scopes the new account to a tenant.
  organizationId?: string;
}

export interface OrgStats {
  userCount: number;
  eventCount: number;
  roleCounts: { admin: number; organizer: number; attendee: number };
}

export interface UsersResponse {
  users: OrgUser[];
  pagination: Pagination;
}

export const usersApi = {
  list: async (params: UserListParams = {}): Promise<UsersResponse> => {
    const res = await apiClient.get(`/users${toQueryString(params)}`);
    return res.data;
  },

  stats: async (): Promise<OrgStats> => {
    const res = await apiClient.get("/users/stats");
    return res.data;
  },

  updateRole: async (
    id: string,
    role: string
  ): Promise<{ user: OrgUser }> => {
    const res = await apiClient.put(`/users/${id}/role`, { role });
    return res.data;
  },

  create: async (data: CreateUserPayload): Promise<{ user: OrgUser }> => {
    const res = await apiClient.post("/users", data);
    return res.data;
  },

  // Settings — any authenticated role can update their own profile.
  updateMyProfile: async (
    name: string
  ): Promise<{ user: import("./auth").User }> => {
    const res = await apiClient.patch("/users/me/profile", { name });
    return res.data;
  },

  updateMyPassword: async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> => {
    const res = await apiClient.patch("/users/me/password", payload);
    return res.data;
  },

  updateReminderPreference: async (
    reminderEmail: boolean
  ): Promise<{ reminderEmail: boolean }> => {
    const res = await apiClient.patch("/users/me/reminders", { reminderEmail });
    return res.data;
  },
};
