import apiClient from "./client";
import { MOCK_USERS, MOCK_ORGANIZATIONS } from "./mockData";
import { computePermissionsForRoles } from "../constants/permissions";

const SESSION_KEY = "edvexa_session_data";

export const authApi = {
  /**
   * Standard login flow.
   * Calls backend /auth/login, with mock fallback.
   */
  login: async (credentials) => {
    try {
      const data = await apiClient.post("/auth/login", credentials);
      if (data?.access_token) {
        localStorage.setItem("edvexa_token", data.access_token);
        if (data.refresh_token) {
          localStorage.setItem("edvexa_refresh_token", data.refresh_token);
        }
      }
      return data;
    } catch (error) {
      // Mock mode fallback for development and testing
      const emailLower = credentials.email?.toLowerCase().trim();
      const matched =
        MOCK_USERS.find((u) => u.email.toLowerCase() === emailLower) ||
        MOCK_USERS.find((u) => u.personaKey === credentials.personaKey) ||
        MOCK_USERS[1]; // default to org admin

      const session = authApi.buildSessionResponse(matched);
      localStorage.setItem("edvexa_token", "mock_jwt_token_" + matched.id);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
  },

  /**
   * Authenticate directly as a named demo persona (Section 21 & 45)
   */
  loginAsPersona: async (personaKey) => {
    const matched =
      MOCK_USERS.find((u) => u.personaKey === personaKey || u.id === personaKey) ||
      MOCK_USERS[1];

    const session = authApi.buildSessionResponse(matched);
    localStorage.setItem("edvexa_token", "mock_jwt_token_" + matched.id);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  /**
   * Helper to format user session response matching Section 54 backend-ready contract:
   * {
   *   user: { id, name, email, studentId, department, avatar },
   *   organization: { id, name, code, status, currency },
   *   roles: [...],
   *   permissions: [...],
   *   membership: { status, planName, expiryDate, ... }
   * }
   */
  buildSessionResponse: (rawUser) => {
    const roles = rawUser.roles || [];
    const permissions = computePermissionsForRoles(roles);

    return {
      access_token: "mock_jwt_token_" + rawUser.id,
      token_type: "bearer",
      user: {
        id: rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        studentId: rawUser.studentId,
        department: rawUser.department,
        avatar: rawUser.avatar,
      },
      organization: rawUser.organization || null,
      roles,
      permissions,
      membership: rawUser.membership || null,
      personaKey: rawUser.personaKey,
      personaTitle: rawUser.personaTitle,
    };
  },

  /**
   * Get current authenticated user session (Section 54)
   * Calls GET /auth/me
   */
  getCurrentUser: async () => {
    try {
      const data = await apiClient.get("/auth/me");
      return data;
    } catch (error) {
      // Mock fallback: restore session from storage
      const cached = localStorage.getItem(SESSION_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // parse error
        }
      }
      // Default to Org Admin if token exists
      const defaultUser = MOCK_USERS[1];
      const session = authApi.buildSessionResponse(defaultUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
  },

  /**
   * Switch tenant organization (Section 29)
   * Requests backend confirmation and returns updated organization context
   */
  switchOrganization: async (organizationId) => {
    try {
      const data = await apiClient.post("/auth/switch-org", { organization_id: organizationId });
      return data;
    } catch (error) {
      // Mock tenant switch
      const org = MOCK_ORGANIZATIONS.find((o) => o.id === organizationId);
      if (!org) throw new Error("Organization not found");

      const cached = localStorage.getItem(SESSION_KEY);
      let session = cached ? JSON.parse(cached) : authApi.buildSessionResponse(MOCK_USERS[1]);
      session.organization = org;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
  },

  /**
   * List available organizations (for Platform Admin or Org Switcher)
   */
  getOrganizations: async () => {
    try {
      return await apiClient.get("/platform/organizations");
    } catch {
      return MOCK_ORGANIZATIONS;
    }
  },

  register: async (payload) => {
    try {
      return await apiClient.post("/auth/register", payload);
    } catch (error) {
      return {
        success: true,
        message: "Registration successful. Please verify your student email.",
        userId: "usr_" + Date.now(),
      };
    }
  },

  forgotPassword: async (email) => {
    try {
      return await apiClient.post("/auth/forgot-password", { email });
    } catch (error) {
      return {
        success: true,
        message: "Password reset link sent to your registered college email.",
      };
    }
  },

  resetPassword: async (payload) => {
    try {
      return await apiClient.post("/auth/reset-password", payload);
    } catch (error) {
      return {
        success: true,
        message: "Password has been successfully reset.",
      };
    }
  },

  verifyEmail: async (token) => {
    try {
      return await apiClient.post("/auth/verify-email", { token });
    } catch (error) {
      return {
        success: true,
        message: "Your college email has been verified.",
      };
    }
  },

  /**
   * Complete logout: clears tokens, cached session, private state (Section 36)
   */
  logout: () => {
    try {
      apiClient.post("/auth/logout").catch(() => {});
    } catch {
      // ignore
    }
    localStorage.removeItem("edvexa_token");
    localStorage.removeItem("edvexa_refresh_token");
    localStorage.removeItem(SESSION_KEY);
  },
};

export default authApi;
