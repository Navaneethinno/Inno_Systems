import axios from "axios";
import { env } from "../config/env";
import { tokenStore } from "../lib/tokenStore";
import { extractOne } from "../lib/extractList";
import { envelopeRefused, sealFields } from "../lib/credentialSeal";
import { API, resolveApiPath } from "./endpoints";

export const API_ERROR_EVENT = "api-error";

/**
 * Single Axios instance shared by every API module.
 * Feature services never call axios directly — they go through this client
 * so auth headers, refresh, and error normalization stay in one place.
 *
 * The backend wraps every response in a `ComposeResponseV1` envelope:
 * { message, status, code, remark, data?, api }. Status casing isn't
 * consistent across handlers ("Fail", "FAIL", "Success" have all been
 * observed live), so it's compared case-insensitively everywhere. A
 * network-level 200 with a failing status is still a failure — the
 * response interceptor below turns that into a rejected promise so
 * callers can just `await` and `catch`. Business failures are also seen
 * on non-2xx status codes (404, 500) with the same envelope shape.
 */
function isFailStatus(status) {
  return typeof status === "string" && status.toUpperCase() === "FAIL";
}
export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use(async (config) => {
  config.url = resolveApiPath(config.url);
  // Credentials are sealed afresh on every send, a retry included, so the
  // plain body is kept aside on the request config.
  if (config._plain === undefined) config._plain = config.data;
  config.data = await sealFields(config._plain);
  // Login carries its own Basic auth header — never overwrite it.
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
    if (response.data && isFailStatus(response.data.status)) {
      return retrySealed(response.config, response.data) ?? Promise.reject(envelopeError(response));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const sealedRetry = retrySealed(originalRequest, error.response?.data);
    if (sealedRetry) return sealedRetry;
    const isLoginCall = originalRequest?.url?.includes(API.AUTH.LOGIN);

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
          `${env.apiBaseUrl}${resolveApiPath(API.AUTH.REFRESH_TOKEN)}`,
          undefined,
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        if (isFailStatus(data.status)) throw envelopeError({ data });

        // Per SYSTEM_API_GUIDE.md, refresh's data is [{ jwt_token, refresh_token, ... }] —
        // a flat record in a one-element array, not wrapped in user_session_info.
        const session = extractOne(data.data) ?? {};
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

// Every error shows the envelope's `message` (user-facing, already
// translated by x-api-lang); `remark` is developer detail and only a
// fallback. Each failure is also announced as an on-screen popup — see
// ErrorToaster.jsx.
function announce(err) {
  window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: err }));
  return err;
}

// A refused credential envelope (key changed, or expired by the clock) is
// sealed again and sent once more.
function retrySealed(config, body) {
  if (!config || config._sealRetry || !envelopeRefused(body?.error_code, body?.server_time)) return null;
  config._sealRetry = true;
  return httpClient(config);
}

function envelopeError(response) {
  const body = response.data ?? {};
  return announce({
    message: body.message || body.remark || "Something went wrong. Please try again.",
    status: response.status,
    code: body.code,
  });
}

function normalizeError(error) {
  const data = error.response?.data;
  return announce({
    message: data?.message || data?.remark || error.message || "Something went wrong. Please try again.",
    status: error.response?.status,
    code: data?.code,
  });
}
