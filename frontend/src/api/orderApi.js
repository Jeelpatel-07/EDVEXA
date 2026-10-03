import apiClient, { getCurrentOrgId } from "./axios";

export const orderApi = {
  getMyOrders: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/orders/me`);
  },

  getOrderById: async (orderId) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/orders/${orderId}`);
  },

  createOrder: async ({ items, type, order_type }) => {
    // Normalise order type
    const resolvedType = order_type || (type === "MERCHANDISE" ? "MERCH" : type);
    // Format items: { variant_id, ticket_type_id, plan_id, quantity }
    const formattedItems = items.map((it) => ({
      ticket_type_id: it.ticket_type_id || it.ticketTypeId || undefined,
      variant_id: it.variant_id || it.variantId || undefined,
      plan_id: it.plan_id || it.planId || undefined,
      quantity: it.quantity || 1,
    }));

    return await apiClient.post(`/orgs/${getCurrentOrgId()}/orders`, {
      order_type: resolvedType,
      items: formattedItems,
    });
  },

  confirmPayment: async (orderId, paymentData = {}) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/orders/${orderId}/pay`, {
      method: paymentData.method || "ONLINE",
      provider_ref: paymentData.provider_ref || undefined,
    });
  },

  getAllOrders: async (params = {}) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/orders`, { params });
  },

  updateFulfillmentStatus: async (orderItemId, status) => {
    return await apiClient.patch(
      `/orgs/${getCurrentOrgId()}/store/order-items/${orderItemId}/fulfillment`,
      { status }
    );
  },
};

export default orderApi;
