import apiClient from "./client";
import { toQueryString, type ListParams, type Pagination } from "./list";

export interface UserListParams extends ListParams {
  role?: string;
}

export interface OrgUser {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "organizer" | "attendee";
  organization: string;
  createdAt: string;
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
};
