import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Single-flight refresh token lock & queue (Section 35)
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

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("edvexa_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

    // Handle 401 with token refresh attempt (Section 35)
    if (status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the request was to the auth endpoints themselves
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        localStorage.removeItem("edvexa_token");
        window.dispatchEvent(new CustomEvent("edvexa:unauthorized"));
        const customError = new Error(
          error.response.data?.detail || "Authentication required. Please log in."
        );
        customError.status = 401;
        return Promise.reject(customError);
      }

      if (isRefreshing) {
        // Queue this request until current refresh finishes
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

      const refreshToken = localStorage.getItem("edvexa_refresh_token");

      try {
        // Attempt backend refresh if available
        let newAccessToken = null;
        if (refreshToken) {
          const res = await axios.post(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          newAccessToken = res.data?.access_token;
        }

        if (newAccessToken) {
          localStorage.setItem("edvexa_token", newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error("Unable to refresh session");
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("edvexa_token");
        localStorage.removeItem("edvexa_refresh_token");
        window.dispatchEvent(new CustomEvent("edvexa:unauthorized"));
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
      switch (status) {
        case 401:
          message = error.response.data?.detail || "Your session has expired. Please sign in.";
          break;
        case 403:
          message =
            error.response.data?.detail ||
            "Access denied. You do not have permission for this section.";
          break;
        case 404:
          message = error.response.data?.detail || "Requested resource was not found.";
          break;
        case 422:
          const detail = error.response.data?.detail;
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
          message = error.response.data?.detail || error.message || "An unexpected error occurred.";
      }
    }

    const customError = new Error(message);
    customError.status = status;
    customError.raw = error;
    return Promise.reject(customError);
  }
);

export default apiClient;
