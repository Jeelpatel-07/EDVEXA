import apiClient, { getCurrentOrgId } from "./axios";

export const userApi = {
  updateRoles: (userId, roles) => apiClient.put(`/orgs/${getCurrentOrgId()}/users/${userId}/roles`, { roles: roles.filter((r) => ["TREASURER", "EVENT_MANAGER", "GATE_STAFF", "VOLUNTEER"].includes(r)) }),
  getUsers: async (params = {}) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/users`, { params });
  },

  getUserById: async (userId) => {
    const list = await userApi.getUsers();
    return list.find((u) => u.id === userId) || null;
  },

  inviteStaff: async (inviteData) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/users/invite`, inviteData);
  },

  assignRole: async (userId, roleCode) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/users/${userId}/roles`, {
      role_code: roleCode,
    });
  },

  revokeRole: async (userId, roleId) => {
    return await apiClient.delete(`/orgs/${getCurrentOrgId()}/users/${userId}/roles/${roleId}`);
  },

  updateUserStatus: async (userId, status) => {
    return await apiClient.patch(`/orgs/${getCurrentOrgId()}/users/${userId}/status`, { status });
  },

  getOrgSettings: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/settings`);
  },

  updateOrgSettings: async (settings) => {
    return await apiClient.patch(`/orgs/${getCurrentOrgId()}/settings`, settings);
  },

  regenerateJoinCode: async () => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/settings/regenerate-join-code`);
  },

  getTerms: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/terms`);
  },

  createTerm: async (termData) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/terms`, termData);
  },

  setCurrentTerm: async (termId) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/terms/${termId}/set-current`);
  },

  getOrgAuditLogs: async (params = {}) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/audit-logs`, { params });
  },
};

export default userApi;
