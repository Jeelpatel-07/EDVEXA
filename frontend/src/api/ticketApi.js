import apiClient, { getCurrentOrgId } from "./axios";

export const ticketApi = {
  getMyTickets: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/tickets/me`);
  },

  getTicketById: async (ticketId) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/tickets/${ticketId}`);
  },

  getTicketQrUrl: (ticketId) => {
    const baseURL = apiClient.defaults.baseURL || "http://localhost:8000/api/v1";
    return `${baseURL}/orgs/${getCurrentOrgId()}/tickets/${ticketId}/qr.png`;
  },

  bookTicket: async ({ ticketTypeId, quantity = 1 }) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/orders`, {
      order_type: "TICKET",
      items: [{ ticket_type_id: ticketTypeId, quantity }],
    });
  },

  validateCheckIn: async ({ qrCode, ticketNumber, code }) => {
    const scanCode = code || qrCode || ticketNumber;
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/tickets/scan`, {
      code: scanCode,
    });
  },

  checkInTicket: async (ticketId) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/tickets/${ticketId}/checkin`);
  },

  refundTicket: async (ticketId, reason = "") => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/tickets/${ticketId}/refund`, {
      reason,
    });
  },

  getCheckInStats: async (eventId) => {
    try {
      const res = await apiClient.get(`/orgs/${getCurrentOrgId()}/events/${eventId}/report`);
      const checkedIn = res.total_checked_in || res.checked_in || 0;
      const total = res.total_sold || res.sold || 1;
      return {
        checkedInCount: checkedIn,
        totalTickets: total,
        percentage: Number(res.attendance_rate || ((checkedIn / Math.max(1, total)) * 100).toFixed(1))
      };
    } catch {
      return { checkedInCount: 0, totalTickets: 0, percentage: 0 };
    }
  },
};

export default ticketApi;
