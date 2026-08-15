import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Local-storage keys for the access/refresh pair. The access token rides in
// the Authorization header; the refresh token is only sent to /auth/refresh.
export const TOKEN_KEY = "token";
export const REFRESH_KEY = "refreshToken";
export const USER_KEY = "user";

let refreshPromise: Promise<string | null> | null = null;

const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
const getRefreshToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;

// Single-flight refresh: concurrent 401s share one POST /auth/refresh call,
// and the new access token is re-issued to every waiting request.
const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${apiClient.defaults.baseURL}/auth/refresh`, { refreshToken })
      .then((res) => {
        const { token, refreshToken: nextRefresh } = res.data;
        if (typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, token);
          if (nextRefresh) localStorage.setItem(REFRESH_KEY, nextRefresh);
        }
        return token as string;
      })
      .catch(() => {
        clearSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let redirectingToLogin = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response || response.status !== 401 || !config || config._retried) {
      return Promise.reject(error);
    }
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    // Try to mint a fresh access token from the refresh token. If that works,
    // replay the original request once with the new token. Only when the
    // refresh itself fails do we treat the session as dead and redirect.
    config._retried = true;
    const newToken = await refreshAccessToken();
    if (newToken) {
      config.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(config);
    }
    if (!redirectingToLogin) {
      redirectingToLogin = true;
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
