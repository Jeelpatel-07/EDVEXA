import apiClient from "./client";
import { MOCK_PRODUCTS } from "./mockData";

export const shopApi = {
  getProducts: async (params = {}) => {
    try {
      return await apiClient.get("/shop/products", { params });
    } catch {
      return MOCK_PRODUCTS;
    }
  },

  getProductById: async (productId) => {
    try {
      return await apiClient.get(`/shop/products/${productId}`);
    } catch {
      return MOCK_PRODUCTS.find((p) => p.id === productId) || MOCK_PRODUCTS[0];
    }
  },

  // Staff Inventory endpoints
  createProduct: async (productData) => {
    try {
      return await apiClient.post("/shop/products", productData);
    } catch {
      const newProd = {
        ...productData,
        id: "prd_" + Date.now(),
        variants: productData.variants || [{ id: "var_" + Date.now(), size: "Standard", color: "Default", stock: 10 }]
      };
      MOCK_PRODUCTS.unshift(newProd);
      return newProd;
    }
  },

  updateProduct: async (productId, productData) => {
    try {
      return await apiClient.put(`/shop/products/${productId}`, productData);
    } catch {
      return { id: productId, ...productData };
    }
  },

  updateStock: async (productId, variantId, newStock) => {
    try {
      return await apiClient.patch(`/shop/products/${productId}/variants/${variantId}/stock`, { stock: newStock });
    } catch {
      const prod = MOCK_PRODUCTS.find((p) => p.id === productId);
      if (prod) {
        const variant = prod.variants.find((v) => v.id === variantId);
        if (variant) variant.stock = newStock;
      }
      return { success: true, productId, variantId, stock: newStock };
    }
  }
};

export default shopApi;
