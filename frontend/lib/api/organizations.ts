import apiClient from "./client";

export interface Organization {
  _id: string;
  name: string;
  slug?: string;
  status?: "active" | "suspended";
  owner?: { _id: string; name: string; email: string } | string;
  createdAt?: string;
}

export const organizationsApi = {
  list: async (): Promise<{ organizations: Organization[] }> => {
    const res = await apiClient.get("/organizations");
    return res.data;
  },

  getMine: async (): Promise<{ organization: Organization }> => {
    const res = await apiClient.get("/organizations/me");
    return res.data;
  },

  updateMine: async (
    data: Partial<Pick<Organization, "name" | "status">>
  ): Promise<{ organization: Organization }> => {
    const res = await apiClient.put("/organizations/me", data);
    return res.data;
  },
};
