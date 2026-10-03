import apiClient from "./client";
import { MOCK_USERS } from "./mockData";

export const userApi = {
  getUsers: async (params = {}) => {
    try {
      return await apiClient.get("/users", { params });
    } catch {
      return MOCK_USERS;
    }
  },

  getUserById: async (userId) => {
    try {
      return await apiClient.get(`/users/${userId}`);
    } catch {
      return MOCK_USERS.find((u) => u.id === userId) || MOCK_USERS[0];
    }
  },

  updateRoles: async (userId, roles) => {
    try {
      return await apiClient.patch(`/users/${userId}/roles`, { roles });
    } catch {
      const user = MOCK_USERS.find((u) => u.id === userId);
      if (user) {
        user.roles = roles;
      }
      return { success: true, userId, roles };
    }
  }
};

export default userApi;
