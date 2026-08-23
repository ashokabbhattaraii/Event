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

  // Co-hosting is never granted directly — it is the result of the invited
  // organization ACCEPTING an invitation (see coHostInvitationsApi below).
  // Removing revokes an existing, already-agreed link, so it stays here.
  removeCoHost: async (eventId: string, orgId: string): Promise<{ coHostOrganizations: CoHostOrganization[] }> => {
    const res = await apiClient.delete(`/events/${eventId}/co-hosts/${orgId}`);
    return res.data;
  },
};

export type CoHostInvitationStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface CoHostInvitation {
  _id: string;
  event: {
    _id: string;
    title: string;
    date: string;
    venue: string;
    category: string;
    type: string;
    status: string;
    capacity: number;
  };
  fromOrganization: { _id: string; name: string; city?: string; country?: string };
  toOrganization: { _id: string; name: string; city?: string; country?: string };
  invitedBy?: { _id: string; name: string; email: string };
  message: string;
  status: CoHostInvitationStatus;
  responseMessage?: string;
  respondedAt?: string;
  createdAt: string;
}

export const coHostInvitationsApi = {
  // --- inviting side (scoped to one event) ---
  listForEvent: async (eventId: string): Promise<{ invitations: CoHostInvitation[] }> => {
    const res = await apiClient.get(`/events/${eventId}/co-host-invitations`);
    return res.data;
  },

  invite: async (
    eventId: string,
    organizationId: string,
    message: string
  ): Promise<{ invitation: CoHostInvitation }> => {
    const res = await apiClient.post(`/events/${eventId}/co-host-invitations`, {
      organizationId,
      message,
    });
    return res.data;
  },

  cancel: async (eventId: string, invitationId: string): Promise<{ invitation: CoHostInvitation }> => {
    const res = await apiClient.delete(`/events/${eventId}/co-host-invitations/${invitationId}`);
    return res.data;
  },

  // --- invited side (my organization's inbox, across all events) ---
  listMine: async (): Promise<{ invitations: CoHostInvitation[] }> => {
    const res = await apiClient.get("/collaboration/invitations");
    return res.data;
  },

  respond: async (
    invitationId: string,
    action: "accept" | "decline",
    message = ""
  ): Promise<{ invitation: CoHostInvitation }> => {
    const res = await apiClient.post(`/collaboration/invitations/${invitationId}/${action}`, {
      message,
    });
    return res.data;
  },
};
