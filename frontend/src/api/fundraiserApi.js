import apiClient from "./client";
import { MOCK_FUNDRAISERS } from "./mockData";

export const fundraiserApi = {
  getFundraisers: async (params = {}) => {
    try {
      return await apiClient.get("/fundraisers", { params });
    } catch {
      return MOCK_FUNDRAISERS;
    }
  },

  getFundraiserById: async (id) => {
    try {
      return await apiClient.get(`/fundraisers/${id}`);
    } catch {
      return MOCK_FUNDRAISERS.find((f) => f.id === id) || MOCK_FUNDRAISERS[0];
    }
  },

  donate: async (fundraiserId, { amount, donorName = "Anonymous" }) => {
    try {
      return await apiClient.post(`/fundraisers/${fundraiserId}/donate`, { amount, donorName });
    } catch {
      const f = MOCK_FUNDRAISERS.find((item) => item.id === fundraiserId);
      if (f) {
        f.raisedAmount += Number(amount);
        f.donorsCount += 1;
      }
      return { success: true, amount, fundraiserId };
    }
  },

  createFundraiser: async (data) => {
    try {
      return await apiClient.post("/fundraisers", data);
    } catch {
      const newF = {
        ...data,
        id: "fnd_" + Date.now(),
        raisedAmount: 0,
        donorsCount: 0,
        status: "ACTIVE"
      };
      MOCK_FUNDRAISERS.unshift(newF);
      return newF;
    }
  },

  updateFundraiser: async (id, data) => {
    try {
      return await apiClient.put(`/fundraisers/${id}`, data);
    } catch {
      return { id, ...data };
    }
  }
};

export default fundraiserApi;
