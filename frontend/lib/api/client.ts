import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Only treat a 401 from the session check (/auth/me) as "session
        // expired". Other endpoints may 401 transiently (e.g. the fire-and-
        // forget location save right after login, or a permission-scoped
        // call) — hard-redirecting there would log the user out even though
        // their session is still valid.
        const url = error.config?.url ?? "";
        const isSessionCheck = url.includes("/auth/me");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (isSessionCheck) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
