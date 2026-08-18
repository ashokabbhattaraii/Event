import apiClient from "./client";

export interface AuditLogEntry {
  _id: string;
  user?: { _id: string; name: string; email: string } | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, any>;
  ip?: string;
  createdAt: string;
}

// Per-user activity trail for the admin user-management console.
// Powered by the same immutable audit trail as the Security page
// (backend GET /audit, admin-only; tenant-scoped for org admins).
export const auditApi = {
  forUser: async (userId: string, limit = 10): Promise<{ logs: AuditLogEntry[]; total: number }> => {
    const res = await apiClient.get(`/audit?userId=${userId}&limit=${limit}`);
    return res.data;
  },
};