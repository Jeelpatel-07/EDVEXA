import apiClient, { getCurrentOrgId } from "./axios";

export const shopApi = {
  getProducts: async (params = {}) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/store/products`, { params });
  },

  getProductById: async (productId) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/store/products/${productId}`);
  },

  createProduct: async (productData) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/store/products`, productData);
  },

  addVariant: async (productId, variantData) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/store/products/${productId}/variants`, variantData);
  },

  updateStock: async (variantId, deltaOrStock, reason = "Stock update") => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/store/variants/${variantId}/stock`, {
      movement_type: deltaOrStock >= 0 ? "RESTOCK" : "ADJUSTMENT",
      quantity_delta: deltaOrStock,
      reason,
    });
  },

  getLowStock: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/store/low-stock`);
  },
};

export default shopApi;
