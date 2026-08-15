import apiClient from "./client";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "organizer" | "attendee";
  organization?: string;
  location?: {
    lat: number;
    lng: number;
    city?: string;
    updatedAt?: string;
  };
  // True for accounts created via Google sign-in — no password to change.
  googleAccount?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  // Admin sign-up creates a new tenant; organizer/attendee sign-up joins one.
  organizationName?: string;
  organizationId?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: async (data: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/register", data);
    return res.data;
  },

  login: async (data: LoginPayload): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/login", data);
    return res.data;
  },

  // Exchange a Google ID-token credential for an app session.
  googleLogin: async (credential: string): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/google", { credential });
    return res.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },
};
