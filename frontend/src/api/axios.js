import axios from "axios";

export const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
let accessToken = null;
let currentOrgId = null;
let refreshPromise = null;
let generation = 0;

export const setAccessToken = (token) => { accessToken = token || null; };
export const getAccessToken = () => accessToken;
export const setCurrentOrgId = (id) => { currentOrgId = id || null; };
export const getCurrentOrgId = () => {
  if (!currentOrgId) {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem("edvexa_current_org") || localStorage.getItem("currentOrgId");
      if (stored) {
        currentOrgId = stored;
        return currentOrgId;
      }
    }
    // Default fallback to primary organization
    return "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  }
  return currentOrgId;
};
export const clearSession = () => {
  accessToken = null;
  currentOrgId = null;
  generation++;
};
export const rememberTokens = (data) => {
  if (!data?.access_token || !data?.csrf_token) throw new Error("Invalid session response.");
  accessToken = data.access_token;
};

const transport = axios.create({ baseURL, withCredentials: true, timeout: 15000 });
export const apiClient = axios.create({
  baseURL, withCredentials: true, timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export function formatError(error) {
  if (error.raw) return error;
  const body = error.response?.data;
  const result = new Error(body?.error?.message ||
    (typeof body?.detail === "string" ? body.detail : null) ||
    (error.response ? "Request failed. Please try again." : "Cannot connect to the server."));
  result.status = error.response?.status;
  result.code = body?.error?.code;
  result.raw = error;
  return result;
}

function sessionExpired(error) {
  clearSession();
  window.dispatchEvent(new CustomEvent("edvexa:unauthorized"));
  return formatError(error);
}

// Serialize cookie rotation across tabs as well as requests within this tab.
const cookieLock = (action) => navigator.locks
  ? navigator.locks.request("edvexa-auth-cookie", action)
  : action();

export function refreshAccess() {
  if (!refreshPromise) {
    const started = generation;
    refreshPromise = cookieLock(async () => {
      // Obtain CSRF for the cookie that is current when this tab acquires the lock.
      const bootstrap = await transport.get("/auth/csrf");
      const response = await transport.post("/auth/refresh", {}, {
        headers: { "X-CSRF-Token": bootstrap.data.csrf_token },
      });
      if (started !== generation) throw new Error("Session changed during refresh.");
      rememberTokens(response.data);
      return response.data;
    }).catch((error) => {
      if (error.response?.status === 401) throw sessionExpired(error);
      throw formatError(error);
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function loginSession(credentials) {
  return cookieLock(async () => {
    const response = await transport.post("/auth/login", credentials);
    rememberTokens(response.data);
    return response.data;
  }).catch((error) => { throw formatError(error); });
}

export async function logoutSession() {
  return cookieLock(async () => {
    // A stale tab must bootstrap CSRF from the current shared cookie.
    const bootstrap = await transport.get("/auth/csrf");
    await transport.post("/auth/logout", {}, {
      headers: { "X-CSRF-Token": bootstrap.data.csrf_token },
    });
    clearSession();
    window.dispatchEvent(new CustomEvent("edvexa:unauthorized"));
  }).catch((error) => {
    if (error.response?.status === 401) { sessionExpired(error); return; }
    throw formatError(error);
  });
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  else delete config.headers.Authorization;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const request = error.config;
    const publicAuth = ["/auth/login", "/auth/register", "/auth/verify-email",
      "/auth/forgot-password", "/auth/reset-password", "/auth/resend-verification",
      "/auth/accept-invite"];
    if (error.response?.status === 401 && request && !request._retry &&
        !publicAuth.includes(request.url)) {
      request._retry = true;
      // Another request may already have refreshed the token that failed here.
      if (!accessToken || request.headers.Authorization === `Bearer ${accessToken}`) {
        await refreshAccess();
      }
      return apiClient(request);
    }
    if (error.response?.status === 401 && !publicAuth.includes(request?.url)) {
      throw sessionExpired(error);
    }
    throw formatError(error);
  }
);

export default apiClient;
