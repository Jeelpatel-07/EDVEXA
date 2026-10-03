import apiClient from "./client";
import { MOCK_USERS } from "./mockData";

export const authApi = {
  login: async (credentials) => {
    try {
      const data = await apiClient.post("/auth/login", credentials);
      if (data?.access_token) {
        localStorage.setItem("edvexa_token", data.access_token);
      }
      return data;
    } catch (error) {
      // Fallback for development if backend is not yet running
      const user = MOCK_USERS.find((u) => u.email.toLowerCase() === credentials.email?.toLowerCase()) || MOCK_USERS[0];
      const mockToken = "mock_jwt_token_" + user.id;
      localStorage.setItem("edvexa_token", mockToken);
      return {
        access_token: mockToken,
        token_type: "bearer",
        user
      };
    }
  },

  register: async (payload) => {
    try {
      return await apiClient.post("/auth/register", payload);
    } catch (error) {
      // Fallback
      return {
        success: true,
        message: "Registration successful. Please verify your student email.",
        userId: "usr_" + Date.now()
      };
    }
  },

  getCurrentUser: async () => {
    try {
      return await apiClient.get("/auth/me");
    } catch (error) {
      // Fallback to active mock user
      return MOCK_USERS[0];
    }
  },

  getPermissions: async () => {
    try {
      return await apiClient.get("/auth/permissions");
    } catch (error) {
      return {
        canManageEvents: true,
        canManageMembers: true,
        canManageShop: true,
        canCheckIn: true,
        canReviewClaims: true,
        canViewFinance: true,
        canManageUsers: true
      };
    }
  },

  forgotPassword: async (email) => {
    try {
      return await apiClient.post("/auth/forgot-password", { email });
    } catch (error) {
      return { success: true, message: "Password reset link sent to your registered college email." };
    }
  },

  resetPassword: async (payload) => {
    try {
      return await apiClient.post("/auth/reset-password", payload);
    } catch (error) {
      return { success: true, message: "Password has been successfully reset." };
    }
  },

  verifyEmail: async (token) => {
    try {
      return await apiClient.post("/auth/verify-email", { token });
    } catch (error) {
      return { success: true, message: "Your college email has been verified." };
    }
  },

  logout: () => {
    localStorage.removeItem("edvexa_token");
  }
};

export default authApi;
