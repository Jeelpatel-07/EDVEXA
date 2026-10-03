import apiClient from "./client";
import { MOCK_ANNOUNCEMENTS } from "./mockData";

export const announcementApi = {
  getAnnouncements: async (params = {}) => {
    try {
      return await apiClient.get("/announcements", { params });
    } catch {
      return MOCK_ANNOUNCEMENTS;
    }
  },

  getAnnouncementById: async (id) => {
    try {
      return await apiClient.get(`/announcements/${id}`);
    } catch {
      return MOCK_ANNOUNCEMENTS.find((a) => a.id === id) || MOCK_ANNOUNCEMENTS[0];
    }
  },

  createAnnouncement: async (data) => {
    try {
      return await apiClient.post("/announcements", data);
    } catch {
      const newAnc = {
        ...data,
        id: "anc_" + Date.now(),
        publishedAt: new Date().toISOString(),
        author: "Alex Rivera (Lead Staff)"
      };
      MOCK_ANNOUNCEMENTS.unshift(newAnc);
      return newAnc;
    }
  },

  updateAnnouncement: async (id, data) => {
    try {
      return await apiClient.put(`/announcements/${id}`, data);
    } catch {
      return { id, ...data };
    }
  },

  deleteAnnouncement: async (id) => {
    try {
      return await apiClient.delete(`/announcements/${id}`);
    } catch {
      return { success: true, id };
    }
  }
};

export default announcementApi;
