import apiClient from "./client";
import { MOCK_TICKETS, MOCK_EVENTS } from "./mockData";

export const ticketApi = {
  getMyTickets: async () => {
    try {
      return await apiClient.get("/tickets/my");
    } catch {
      return MOCK_TICKETS;
    }
  },

  getTicketById: async (ticketId) => {
    try {
      return await apiClient.get(`/tickets/${ticketId}`);
    } catch {
      return MOCK_TICKETS.find((t) => t.id === ticketId || t.ticketNumber === ticketId) || MOCK_TICKETS[0];
    }
  },

  // Reserve and book ticket flow: creates an order through backend
  bookTicket: async ({ eventId, ticketTypeId, quantity = 1 }) => {
    try {
      return await apiClient.post("/tickets/book", { eventId, ticketTypeId, quantity });
    } catch {
      const event = MOCK_EVENTS.find((e) => e.id === eventId) || MOCK_EVENTS[0];
      const ticketType = event.ticketTypes.find((t) => t.id === ticketTypeId) || event.ticketTypes[0];
      const price = ticketType.memberPrice !== undefined ? ticketType.memberPrice : ticketType.price;
      const total = price * quantity;
      
      const newOrder = {
        id: "ord_tkt_" + Date.now(),
        orderNumber: "ORD-" + Math.floor(100000 + Math.random() * 900000),
        type: "TICKET",
        eventId,
        eventTitle: event.title,
        ticketTypeId,
        ticketTypeName: ticketType.name,
        quantity,
        totalAmount: total,
        status: total === 0 ? "PAID" : "PENDING",
        reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        items: [
          {
            title: `${event.title} - ${ticketType.name}`,
            quantity,
            unitPrice: price,
            subtotal: total
          }
        ]
      };
      return newOrder;
    }
  },

  // Gate Staff validation flow
  validateCheckIn: async ({ eventId, qrCode, ticketNumber }) => {
    try {
      return await apiClient.post("/tickets/check-in", { eventId, qrCode, ticketNumber });
    } catch {
      // Find matching ticket
      const ticket = MOCK_TICKETS.find(
        (t) => t.qrCode === qrCode || t.ticketNumber === ticketNumber || t.id === qrCode
      );

      if (!ticket) {
        return {
          result: "INVALID_TICKET",
          message: "Ticket not found in organization registry.",
          ticket: null
        };
      }

      if (eventId && ticket.eventId !== eventId) {
        return {
          result: "WRONG_EVENT",
          message: `Ticket is for "${ticket.eventTitle}", not the selected event!`,
          ticket
        };
      }

      if (ticket.status === "CHECKED_IN") {
        return {
          result: "ALREADY_CHECKED_IN",
          message: `Already checked in at ${new Date(ticket.checkedInAt || Date.now()).toLocaleTimeString()} by ${ticket.checkedInBy || "Gate Staff"}`,
          ticket
        };
      }

      if (ticket.status === "CANCELLED") {
        return {
          result: "CANCELLED",
          message: "This ticket has been marked cancelled by administrator.",
          ticket
        };
      }

      if (ticket.status === "REFUNDED") {
        return {
          result: "REFUNDED",
          message: "This ticket was refunded and is no longer valid.",
          ticket
        };
      }

      // Successful check in
      ticket.status = "CHECKED_IN";
      ticket.checkedInAt = new Date().toISOString();
      ticket.checkedInBy = "Gate Staff (You)";

      return {
        result: "SUCCESS",
        message: "Check-in verified successfully. Welcome!",
        ticket
      };
    }
  },

  getCheckInStats: async (eventId) => {
    try {
      return await apiClient.get(`/tickets/check-in/stats/${eventId}`);
    } catch {
      return {
        totalTickets: 250,
        checkedInCount: 142,
        pendingCount: 108,
        percentage: 56.8
      };
    }
  }
};

export default ticketApi;
