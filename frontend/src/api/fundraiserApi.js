import apiClient, { getCurrentOrgId } from "./axios";

export const fundraiserApi = {
  getFundraisers: async (params = {}) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/fundraisers`, { params });
  },

  getFundraiserById: async (id) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/fundraisers/${id}`);
  },

  createFundraiser: async (data) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/fundraisers`, data);
  },

  donate: async (fundraiserId, { amount }) => {
    // Record fundraiser donation order
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/orders`, {
      order_type: "MEMBERSHIP", // or direct payment
      items: [],
    });
  },
};

export default fundraiserApi;
