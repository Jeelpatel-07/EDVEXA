import apiClient, { getCurrentOrgId } from "./axios";

export const taskApi = {
  getMyTasks: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/tasks/mine`);
  },

  getAllTasks: async (params = {}) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/tasks`, { params });
  },

  getTaskById: async (id) => {
    const list = await taskApi.getAllTasks();
    return list.find((t) => t.id === id) || null;
  },

  updateTaskStatus: async (id, status, notes = "") => {
    const res = await apiClient.patch(`/orgs/${getCurrentOrgId()}/tasks/${id}/status`, { status });
    if (notes) {
      await apiClient.post(`/orgs/${getCurrentOrgId()}/tasks/${id}/comments`, { comment: notes });
    }
    return res;
  },

  createTask: async (taskData) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/tasks`, taskData);
  },

  addComment: async (taskId, comment) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/tasks/${taskId}/comments`, { comment });
  },
};

export default taskApi;
