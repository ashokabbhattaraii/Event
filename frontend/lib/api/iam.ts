import apiClient from "./client";

export interface RolePermission {
  _id: string;
  name: string;
  description: string;
  scope: "system" | "organization";
  permissions: string[];
  // Resolved effective permission codes (DB list, or the static matrix
  // fallback for unseeded roles) — what requirePermission actually checks.
  effectivePermissions: string[];
}

export interface PermissionDefinition {
  _id: string;
  code: string;
  name: string;
  description: string;
  scope: "system" | "organization";
}

export const iamApi = {
  roles: async (): Promise<{ roles: RolePermission[] }> => {
    const res = await apiClient.get("/iam/roles");
    return res.data;
  },

  permissions: async (): Promise<{ permissions: PermissionDefinition[] }> => {
    const res = await apiClient.get("/iam/permissions");
    return res.data;
  },

  // Replace a role's permission set. The caller passes the full desired list
  // of permission codes — toggles on/off in the matrix UI.
  updateRole: async (id: string, permissions: string[]): Promise<{ role: RolePermission }> => {
    const res = await apiClient.put(`/iam/roles/${id}/permissions`, { permissions });
    return res.data;
  },
};
