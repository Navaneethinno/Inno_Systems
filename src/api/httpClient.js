import axios from "axios";
import { env } from "../config/env";
import { tokenStore } from "../lib/tokenStore";

/**
 * Single Axios instance shared by every API module.
 * Feature services never call axios directly — they go through this client
 * so auth headers, refresh, and error normalization stay in one place.
 *
 * The backend wraps every response in a `ComposeResponseV1` envelope:
 * { message, status: "SUCCESS" | "FAIL", code, remark, data?, api }.
 * A network-level 200 with status "FAIL" is still a failure — the response
 * interceptor below turns that into a rejected promise so callers can just
 * `await` and `catch`.
 */
export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use((config) => {
  // /system/user/login carries its own Basic auth header — never overwrite it.
  if (!config.headers.Authorization) {
    const token = tokenStore.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

httpClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.status === "FAIL") {
      return Promise.reject(envelopeError(response));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isLoginCall = originalRequest?.url?.includes("/system/user/login");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isLoginCall) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject, request: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = tokenStore.getRefreshToken();
        if (!refreshToken) throw error;

        const { data } = await axios.post(
          `${env.apiBaseUrl}/system/user/refresh_token`,
          undefined,
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        if (data.status === "FAIL") throw envelopeError({ data });

        const session = data.data?.user_session_info ?? data.data ?? {};
        tokenStore.updateTokens({ jwtToken: session.jwt_token, refreshToken: session.refresh_token });

        pendingQueue.forEach(({ resolve, request }) => resolve(httpClient(request)));
        pendingQueue = [];

        return httpClient(originalRequest);
      } catch (refreshError) {
        pendingQueue.forEach(({ reject }) => reject(refreshError));
        pendingQueue = [];
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

function envelopeError(response) {
  const body = response.data ?? {};
  return {
    message: body.remark || body.message || "Something went wrong. Please try again.",
    status: response.status,
    code: body.code,
  };
}

function normalizeError(error) {
  const data = error.response?.data;
  return {
    message: data?.remark || data?.message || error.message || "Something went wrong. Please try again.",
    status: error.response?.status,
    code: data?.code,
  };
}
