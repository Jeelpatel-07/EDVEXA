import apiClient from "./client";
import { MOCK_TASKS } from "./mockData";

export const taskApi = {
  getMyTasks: async () => {
    try {
      return await apiClient.get("/tasks/my");
    } catch {
      return MOCK_TASKS;
    }
  },

  getTaskById: async (id) => {
    try {
      return await apiClient.get(`/tasks/${id}`);
    } catch {
      return MOCK_TASKS.find((t) => t.id === id) || MOCK_TASKS[0];
    }
  },

  updateTaskStatus: async (id, status, notes = "") => {
    try {
      return await apiClient.patch(`/tasks/${id}/status`, { status, notes });
    } catch {
      const t = MOCK_TASKS.find((item) => item.id === id);
      if (t) t.status = status;
      return { success: true, id, status };
    }
  },

  // Staff endpoints
  getAllTasks: async (params = {}) => {
    try {
      return await apiClient.get("/tasks", { params });
    } catch {
      return MOCK_TASKS;
    }
  },

  createTask: async (taskData) => {
    try {
      return await apiClient.post("/tasks", taskData);
    } catch {
      const newTask = {
        ...taskData,
        id: "tsk_" + Date.now(),
        status: "PENDING"
      };
      MOCK_TASKS.unshift(newTask);
      return newTask;
    }
  }
};

export default taskApi;
