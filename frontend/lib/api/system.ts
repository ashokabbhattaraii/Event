import apiClient from "./client";
import { toQueryString, type ListParams, type Pagination } from "./list";

export interface OrgRegisterPayload {
  orgName: string;
  orgEmail?: string;
  orgPhone?: string;
  orgAddress?: string;
  orgCity?: string;
  orgCountry?: string;
  orgType?: string;
  orgDescription?: string;
  orgWebsite?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface PendingOrganization {
  _id: string;
  name: string;
  slug: string;
  status: "pending" | "active" | "rejected" | "suspended";
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  type?: string;
  description?: string;
  website?: string;
  rejectionReason?: string;
  createdAt: string;
  admin?: { _id: string; name: string; email: string } | null;
}

export interface OrganizationListParams extends ListParams {
  status?: string;
}

export interface OrganizationsResponse {
  organizations: PendingOrganization[];
  pagination: Pagination;
}

export const systemAdminApi = {
  orgRegister: async (data: OrgRegisterPayload): Promise<{ message: string }> => {
    const res = await apiClient.post("/auth/org-register", data);
    return res.data;
  },

  listOrganizations: async (
    params: OrganizationListParams = {}
  ): Promise<OrganizationsResponse> => {
    const res = await apiClient.get(`/system/orgs${toQueryString(params)}`);
    return res.data;
  },

  approveOrganization: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.post(`/system/orgs/${id}/approve`);
    return res.data;
  },

  rejectOrganization: async (id: string, reason: string): Promise<{ message: string }> => {
    const res = await apiClient.post(`/system/orgs/${id}/reject`, { reason });
    return res.data;
  },

  // System-admin tenant lifecycle: rename or flip active<->suspended.
  updateOrganization: async (
    id: string,
    data: { name?: string; status?: "active" | "suspended" }
  ): Promise<{ organization: PendingOrganization }> => {
    const res = await apiClient.patch(`/system/orgs/${id}`, data);
    return res.data;
  },
};
