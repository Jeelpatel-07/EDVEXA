import apiClient, { getCurrentOrgId } from "./axios";

export const membershipApi = {
  getPlans: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/memberships/plans`);
  },

  getCurrentMembership: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/memberships/me`);
  },

  joinPlan: async (planId) => {
    // Create an order for membership purchase
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/orders`, {
      order_type: "MEMBERSHIP",
      items: [{ plan_id: planId, quantity: 1 }],
    });
  },

  renewMembership: async (membershipId) => {
    // Renewal uses current membership's plan
    const current = await apiClient.get(`/orgs/${getCurrentOrgId()}/memberships/me`);
    if (!current?.plan_id) {
      throw new Error("No active or expiring membership found to renew.");
    }
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/orders`, {
      order_type: "MEMBERSHIP",
      items: [{ plan_id: current.plan_id, quantity: 1 }],
    });
  },

  getMembersList: async (params = {}) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/memberships/members`, { params });
  },

  verifyMemberQr: async (qrToken) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/memberships/verify/${encodeURIComponent(qrToken)}`);
  },

  createPlan: async (planData) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/memberships/plans`, planData);
  },

  manualCashMembership: async (data) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/memberships/members/manual`, data);
  },
};

export default membershipApi;
