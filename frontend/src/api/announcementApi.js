import apiClient, { getCurrentOrgId } from "./axios";

export const announcementApi = {
  getAnnouncements: async (params = {}) => {
    try {
      return await apiClient.get(`/orgs/${getCurrentOrgId()}/announcements`, { params });
    } catch {
      return await apiClient.get("/public/o/edvexa/announcements");
    }
  },

  getAnnouncementById: async (id) => {
    const list = await announcementApi.getAnnouncements();
    return list.find((a) => a.id === id) || null;
  },

  createAnnouncement: async (data) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/announcements`, data);
  },

  updateAnnouncement: async (id, data) => {
    return await apiClient.patch(`/orgs/${getCurrentOrgId()}/announcements/${id}`, data);
  },

  deleteAnnouncement: async (id) => {
    return await apiClient.delete(`/orgs/${getCurrentOrgId()}/announcements/${id}`);
  },

  subscribeMailingList: async (email) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/announcements/subscribe`, { email });
  },

  getPublicAnnouncements: async (slug = "edvexa") => {
    return await apiClient.get(`/public/o/${slug}/announcements`);
  },
};

export default announcementApi;
