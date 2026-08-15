import apiClient from "./client";

export interface Organization {
  _id: string;
  name: string;
  slug?: string;
  status?: "active" | "suspended" | "pending" | "rejected";
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  owner?: { _id: string; name: string; email: string } | string;
  createdAt?: string;
}

export interface CoHostOrganization extends Organization {}

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

  // Co-host management for an event
  listCoHosts: async (eventId: string): Promise<{ coHostOrganizations: CoHostOrganization[] }> => {
    const res = await apiClient.get(`/events/${eventId}/co-hosts`);
    return res.data;
  },

  addCoHost: async (eventId: string, organizationId: string): Promise<{ coHostOrganizations: CoHostOrganization[] }> => {
    const res = await apiClient.post(`/events/${eventId}/co-hosts`, { organizationId });
    return res.data;
  },

  removeCoHost: async (eventId: string, orgId: string): Promise<{ coHostOrganizations: CoHostOrganization[] }> => {
    const res = await apiClient.delete(`/events/${eventId}/co-hosts/${orgId}`);
    return res.data;
  },
};
