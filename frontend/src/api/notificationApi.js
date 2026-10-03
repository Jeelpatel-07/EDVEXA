import apiClient, { getCurrentOrgId } from "./axios";

export const notificationApi = {
  getNotifications: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/notifications/me`);
  },

  markAsRead: async (id) => {
    return await apiClient.patch(`/orgs/${getCurrentOrgId()}/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    const list = await notificationApi.getNotifications();
    await Promise.all(
      list.filter((n) => n.status !== "READ").map((n) => notificationApi.markAsRead(n.id))
    );
    return { success: true };
  },
};

export default notificationApi;
