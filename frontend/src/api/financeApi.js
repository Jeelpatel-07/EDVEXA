import apiClient, { getCurrentOrgId } from "./axios";

export const financeApi = {
  getSummary: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/finance/summary`);
  },

  getLedgerEntries: async (params = {}) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/finance/ledger`, { params });
  },

  createEntry: async (entryData) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/finance/ledger/manual`, {
      category_id: entryData.category_id || entryData.categoryId,
      direction: entryData.direction || (entryData.type === "EXPENSE" ? "OUT" : "IN"),
      amount: parseFloat(entryData.amount),
      description: entryData.description,
      reference: entryData.reference || entryData.ref || undefined,
    });
  },

  getCategories: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/finance/categories`);
  },

  getExportCsvUrl: () => {
    const baseURL = apiClient.defaults.baseURL || "http://localhost:8000/api/v1";
    return `${baseURL}/orgs/${getCurrentOrgId()}/finance/export.csv`;
  },
};

export default financeApi;
