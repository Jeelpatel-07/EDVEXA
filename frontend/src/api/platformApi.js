import apiClient from "./axios";

export const platformApi = {
  getStats: async () => {
    return await apiClient.get("/platform/stats");
  },

  getOrganizations: async (params = {}) => {
    return await apiClient.get("/platform/organizations", { params });
  },

  getOrganizationById: async (id) => {
    return await apiClient.get(`/platform/organizations/${id}`);
  },

  createOrganization: async (orgData) => {
    return await apiClient.post("/platform/organizations", orgData);
  },

  updateOrganization: async (id, data) => {
    return await apiClient.patch(`/platform/organizations/${id}`, data);
  },

  suspendOrganization: async (id, reason = "") => {
    return await apiClient.post(`/platform/organizations/${id}/suspend`, { reason });
  },

  activateOrganization: async (id, reason = "") => {
    return await apiClient.post(`/platform/organizations/${id}/activate`, { reason });
  },

  inviteOrgAdmin: async (adminData) => {
    return await apiClient.post("/platform/admins", adminData);
  },

  getAuditLogs: async (params = {}) => {
    return await apiClient.get("/platform/audit-logs", { params });
  },

  getSettings: async () => {
    return await apiClient.get("/platform/settings");
  },

  updateSettings: async (settings) => {
    return await apiClient.put("/platform/settings", settings);
  },

  getUsers: async (params = {}) => {
    return await apiClient.get("/platform/users", { params });
  },
};

export default platformApi;
