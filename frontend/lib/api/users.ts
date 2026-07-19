import apiClient from "./client";

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
}

export const usersApi = {
  list: async (): Promise<{ users: OrgUser[] }> => {
    const res = await apiClient.get("/users");
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
