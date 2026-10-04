import apiClient, { getCurrentOrgId, getCurrentOrgSlug } from "./axios";

export const eventApi = {
  getEvents: async (params = {}, slug) => {
    try {
      return await apiClient.get(`/orgs/${getCurrentOrgId()}/events`, { params });
    } catch (err) {
      // Fallback to public events if unauthenticated
      const activeSlug = slug || getCurrentOrgSlug();
      return await apiClient.get(`/public/o/${activeSlug}/events`);
    }
  },

  getEventById: async (eventId, slug) => {
    try {
      return await apiClient.get(`/orgs/${getCurrentOrgId()}/events/${eventId}`);
    } catch (err) {
      const activeSlug = slug || getCurrentOrgSlug();
      return await apiClient.get(`/public/o/${activeSlug}/events/${eventId}`);
    }
  },

  createEvent: async (eventData) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/events`, eventData);
  },

  updateEvent: async (eventId, eventData) => {
    return await apiClient.patch(`/orgs/${getCurrentOrgId()}/events/${eventId}`, eventData);
  },

  publishEvent: async (eventId) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/events/${eventId}/publish`);
  },

  cancelEvent: async (eventId) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/events/${eventId}/cancel`);
  },

  getEventReport: async (eventId) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/events/${eventId}/report`);
  },

  createTicketType: async (eventId, data) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/events/${eventId}/ticket-types`, data);
  },

  getPublicEvents: async (slug = "edvexa") => {
    return await apiClient.get(`/public/o/${slug}/events`);
  },

  getPublicEventDetail: async (slug = "edvexa", eventId) => {
    return await apiClient.get(`/public/o/${slug}/events/${eventId}`);
  },
};

export default eventApi;
