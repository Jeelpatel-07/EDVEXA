import apiClient from "./client";
import { MOCK_EVENTS } from "./mockData";

export const eventApi = {
  getEvents: async (params = {}) => {
    try {
      return await apiClient.get("/events", { params });
    } catch {
      return MOCK_EVENTS;
    }
  },

  getEventById: async (eventId) => {
    try {
      return await apiClient.get(`/events/${eventId}`);
    } catch {
      return MOCK_EVENTS.find((e) => e.id === eventId || e.slug === eventId) || MOCK_EVENTS[0];
    }
  },

  // Staff endpoints
  createEvent: async (eventData) => {
    try {
      return await apiClient.post("/events", eventData);
    } catch {
      const newEvent = {
        ...eventData,
        id: "evt_" + Date.now(),
        registeredCount: 0,
        status: "UPCOMING"
      };
      MOCK_EVENTS.unshift(newEvent);
      return newEvent;
    }
  },

  updateEvent: async (eventId, eventData) => {
    try {
      return await apiClient.put(`/events/${eventId}`, eventData);
    } catch {
      return { id: eventId, ...eventData };
    }
  },

  deleteEvent: async (eventId) => {
    try {
      return await apiClient.delete(`/events/${eventId}`);
    } catch {
      return { success: true, eventId };
    }
  }
};

export default eventApi;
