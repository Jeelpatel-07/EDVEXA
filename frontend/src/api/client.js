import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

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

// Response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response ? error.response.status : null;
    let message = "A network error occurred. Please check your connection.";

    if (error.response) {
      switch (status) {
        case 401:
          message = error.response.data?.detail || "Authentication required. Please log in.";
          localStorage.removeItem("edvexa_token");
          // Dispatch global unauthorized event if needed
          window.dispatchEvent(new CustomEvent("edvexa:unauthorized"));
          break;
        case 403:
          message = error.response.data?.detail || "Access denied. You do not have permission for this action.";
          break;
        case 404:
          message = error.response.data?.detail || "Requested resource was not found.";
          break;
        case 422:
          // FastAPI validation errors format
          const detail = error.response.data?.detail;
          if (Array.isArray(detail)) {
            message = detail.map((err) => `${err.loc?.slice(1).join(".")}: ${err.msg}`).join(", ");
          } else {
            message = detail || "Invalid input data provided.";
          }
          break;
        case 500:
          message = "Internal server error. Please try again later or contact staff.";
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
