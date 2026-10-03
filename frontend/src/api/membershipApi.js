import apiClient from "./client";
import { MOCK_MEMBERSHIP_PLANS, MOCK_USERS } from "./mockData";

export const membershipApi = {
  getPlans: async () => {
    try {
      return await apiClient.get("/membership/plans");
    } catch {
      return MOCK_MEMBERSHIP_PLANS;
    }
  },

  getCurrentMembership: async () => {
    try {
      return await apiClient.get("/membership/current");
    } catch {
      return MOCK_USERS[0].membership;
    }
  },

  joinPlan: async (planId) => {
    try {
      return await apiClient.post("/membership/join", { planId });
    } catch {
      const plan = MOCK_MEMBERSHIP_PLANS.find((p) => p.id === planId) || MOCK_MEMBERSHIP_PLANS[1];
      return {
        orderId: "ord_mem_" + Date.now(),
        planId,
        amount: plan.price,
        status: "PENDING_PAYMENT",
        message: "Order created for membership purchase. Please proceed to payment."
      };
    }
  },

  renewMembership: async (membershipId) => {
    try {
      return await apiClient.post(`/membership/${membershipId}/renew`);
    } catch {
      return {
        orderId: "ord_renew_" + Date.now(),
        membershipId,
        amount: 35.00,
        status: "PENDING_PAYMENT"
      };
    }
  },

  // Staff endpoints
  getMembersList: async (params = {}) => {
    try {
      return await apiClient.get("/membership/members", { params });
    } catch {
      return MOCK_USERS;
    }
  },

  getMemberDetails: async (userId) => {
    try {
      return await apiClient.get(`/membership/members/${userId}`);
    } catch {
      return MOCK_USERS.find((u) => u.id === userId) || MOCK_USERS[0];
    }
  },

  updateMemberStatus: async (userId, status) => {
    try {
      return await apiClient.patch(`/membership/members/${userId}/status`, { status });
    } catch {
      return { success: true, userId, status };
    }
  }
};

export default membershipApi;
