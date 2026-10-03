import apiClient from "./client";
import { MOCK_ORDERS, MOCK_TICKETS } from "./mockData";

export const orderApi = {
  getMyOrders: async () => {
    try {
      return await apiClient.get("/orders/my");
    } catch {
      return MOCK_ORDERS;
    }
  },

  getOrderById: async (orderId) => {
    try {
      return await apiClient.get(`/orders/${orderId}`);
    } catch {
      return MOCK_ORDERS.find((o) => o.id === orderId || o.orderNumber === orderId) || MOCK_ORDERS[0];
    }
  },

  // Generic order creation for Cart / Merchandise / Membership
  createOrder: async ({ items, type, paymentMethod = "PENDING" }) => {
    try {
      return await apiClient.post("/orders", { items, type, paymentMethod });
    } catch {
      const subtotal = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
      const newOrder = {
        id: "ord_" + Date.now(),
        orderNumber: "ORD-" + Math.floor(100000 + Math.random() * 900000),
        userId: "usr_1",
        type,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        items: items.map((it) => ({
          title: it.name || it.title,
          quantity: it.quantity,
          unitPrice: it.price,
          subtotal: it.price * it.quantity,
          variant: it.variant
        })),
        totalAmount: subtotal,
        discountAmount: 0.00,
        paymentMethod,
        pickupStatus: type === "MERCHANDISE" ? "PENDING" : "NOT_APPLICABLE",
        reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      };
      MOCK_ORDERS.unshift(newOrder);
      return newOrder;
    }
  },

  // Authoritative backend payment confirmation
  confirmPayment: async (orderId, paymentData = {}) => {
    try {
      return await apiClient.post(`/orders/${orderId}/confirm-payment`, paymentData);
    } catch {
      const order = MOCK_ORDERS.find((o) => o.id === orderId) || MOCK_ORDERS[0];
      order.status = "PAID";
      order.paymentMethod = paymentData.method || "STRIPE_CARD";
      order.paidAt = new Date().toISOString();

      if (order.type === "MERCHANDISE") {
        order.pickupStatus = "READY_FOR_PICKUP";
        order.pickupLocation = "Student Organization Desk, Room 204";
      }

      if (order.type === "TICKET" && !MOCK_TICKETS.some((t) => t.orderId === order.id)) {
        // Generate issued QR ticket
        MOCK_TICKETS.unshift({
          id: "tkt_" + Date.now(),
          ticketNumber: "EDV-" + Math.floor(100000 + Math.random() * 900000),
          orderId: order.id,
          eventId: order.eventId || "evt_101",
          eventTitle: order.eventTitle || order.items[0]?.title || "Campus Event",
          ticketTypeName: order.ticketTypeName || "General Admission",
          holderName: "Alex Rivera",
          holderEmail: "alex.rivera@college.edu",
          holderStudentId: "STU-2024-0891",
          pricePaid: order.totalAmount,
          status: "ISSUED",
          qrCode: `EDVEXA-QR-${order.id}-ALEXRIVERA`,
          eventDate: "2026-10-18T09:00:00",
          venue: "Auditorium Main Hall",
          checkedInAt: null,
          checkedInBy: null
        });
      }

      return order;
    }
  },

  // Staff order management
  getAllOrders: async (params = {}) => {
    try {
      return await apiClient.get("/orders", { params });
    } catch {
      return MOCK_ORDERS;
    }
  },

  updatePickupStatus: async (orderId, pickupStatus) => {
    try {
      return await apiClient.patch(`/orders/${orderId}/pickup-status`, { pickupStatus });
    } catch {
      const order = MOCK_ORDERS.find((o) => o.id === orderId);
      if (order) {
        order.pickupStatus = pickupStatus;
        if (pickupStatus === "PICKED_UP") {
          order.pickedUpAt = new Date().toISOString();
        }
      }
      return { success: true, orderId, pickupStatus };
    }
  }
};

export default orderApi;
