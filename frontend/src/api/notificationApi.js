import apiClient from "./client";
import { MOCK_NOTIFICATIONS } from "./mockData";

export const notificationApi = {
  getNotifications: async () => {
    try {
      return await apiClient.get("/notifications");
    } catch {
      return MOCK_NOTIFICATIONS;
    }
  },

  markAsRead: async (id) => {
    try {
      return await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      const item = MOCK_NOTIFICATIONS.find((n) => n.id === id);
      if (item) item.read = true;
      return { success: true, id };
    }
  },

  markAllAsRead: async () => {
    try {
      return await apiClient.post("/notifications/read-all");
    } catch {
      MOCK_NOTIFICATIONS.forEach((n) => (n.read = true));
      return { success: true };
    }
  }
};

export default notificationApi;
