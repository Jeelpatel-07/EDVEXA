import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

let inMemoryAccessToken = null;
let currentOrgId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => {
  return inMemoryAccessToken;
};

export const setCurrentOrgId = (orgId) => {
  if (orgId) {
    currentOrgId = orgId;
    localStorage.setItem("edvexa_org_id", orgId);
  }
};

export const getCurrentOrgId = () => {
  if (!currentOrgId) {
    currentOrgId = localStorage.getItem("edvexa_org_id") || "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  }
  return currentOrgId;
};

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to attach in-memory JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with unified error handling and single-process token refresh
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;

    // Handle 401 with token refresh attempt
    if (status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || "";
      if (
        url.includes("/auth/login") ||
        url.includes("/auth/refresh") ||
        url.includes("/auth/register")
      ) {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent("edvexa:unauthorized", {
          detail: { message: error.response?.data?.detail || "Authentication required." }
        }));
        const customError = new Error(
          error.response?.data?.detail || "Authentication required. Please log in."
        );
        customError.status = 401;
        return Promise.reject(customError);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = res.data?.access_token;

        if (newAccessToken) {
          setAccessToken(newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error("Unable to refresh session");
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent("edvexa:unauthorized", {
          detail: { message: "Your session has expired. Please sign in again." }
        }));
        const customError = new Error("Your session has expired. Please sign in again.");
        customError.status = 401;
        return Promise.reject(customError);
      } finally {
        isRefreshing = false;
      }
    }

    // Standard error formatting
    let message = "A network error occurred. Please check your connection.";
    if (error.response) {
      const data = error.response.data;
      switch (status) {
        case 401:
          message = data?.detail || "Your session has expired. Please sign in.";
          break;
        case 403:
          message = data?.detail || "Access denied. You do not have permission for this section.";
          break;
        case 404:
          message = data?.detail || "Requested resource was not found.";
          break;
        case 422:
          const detail = data?.detail;
          if (Array.isArray(detail)) {
            message = detail.map((err) => `${err.loc?.slice(1).join(".")}: ${err.msg}`).join(", ");
          } else {
            message = detail || "Invalid input data provided.";
          }
          break;
        case 500:
          message = "Internal server error. Please try again later or contact support.";
          break;
        default:
          message = data?.detail || error.message || "An unexpected error occurred.";
      }
    }

    const customError = new Error(message);
    customError.status = status;
    customError.raw = error;
    return Promise.reject(customError);
  }
);

export default apiClient;
