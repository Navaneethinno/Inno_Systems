import axios from "axios";
import { env } from "../config/env";
import { tokenStore } from "../lib/tokenStore";

/**
 * Single Axios instance shared by every API module.
 * Feature services never call axios directly — they go through this client
 * so auth headers, refresh, and error normalization stay in one place.
 */
export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push(() => resolve(httpClient(originalRequest)));
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = tokenStore.getRefreshToken();
        if (!refreshToken) throw error;

        const { data } = await axios.post(`${env.apiBaseUrl}/auth/refresh`, { refreshToken });
        tokenStore.setTokens(data.accessToken, data.refreshToken);

        pendingQueue.forEach((resolveQueued) => resolveQueued());
        pendingQueue = [];

        return httpClient(originalRequest);
      } catch (refreshError) {
        tokenStore.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

function normalizeError(error) {
  const data = error.response?.data;
  return {
    message: data?.message ?? error.message ?? "Something went wrong. Please try again.",
    status: error.response?.status,
    code: data?.code,
  };
}
