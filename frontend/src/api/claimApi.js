import apiClient, { getCurrentOrgId } from "./axios";

export const claimApi = {
  getMyClaims: async () => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/finance/claims/mine`);
  },

  getAllClaims: async (params = {}) => {
    return await apiClient.get(`/orgs/${getCurrentOrgId()}/finance/claims`, { params });
  },

  getClaimById: async (id) => {
    try {
      const single = await apiClient.get(`/orgs/${getCurrentOrgId()}/finance/claims/${id}`);
      if (single) return single;
    } catch (e) {
      console.warn("Direct claim lookup failed, falling back to list:", e);
    }
    const list = await claimApi.getAllClaims();
    return list.find((c) => c.id === id) || null;
  },

  submitClaim: async (claimData) => {
    const formData = new FormData();
    formData.append("title", claimData.title || claimData.purpose || "Expense Claim");
    formData.append("description", claimData.description || claimData.notes || "");
    formData.append("amount", claimData.amount);
    if (claimData.category_id) {
      formData.append("category_id", claimData.category_id);
    }
    if (claimData.receipt) {
      formData.append("receipt", claimData.receipt);
    }

    return await apiClient.post(`/orgs/${getCurrentOrgId()}/finance/claims`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  approveClaim: async (claimId) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/finance/claims/${claimId}/approve`);
  },

  rejectClaim: async (claimId, reason) => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/finance/claims/${claimId}/reject`, {
      action: "REJECT",
      reject_reason: reason || "Rejected by treasurer",
      reason: reason || "Rejected by treasurer",
    });
  },

  reimburseClaim: async (claimId, paymentRef = "ONLINE_BANK_TRANSFER") => {
    return await apiClient.post(`/orgs/${getCurrentOrgId()}/finance/claims/${claimId}/reimburse`, {
      payment_ref: paymentRef,
    });
  },

  reviewClaim: async (claimId, { status, notes }) => {
    if (status === "APPROVED") {
      return await claimApi.approveClaim(claimId);
    } else if (status === "REJECTED") {
      return await claimApi.rejectClaim(claimId, notes);
    } else if (status === "REIMBURSED") {
      return await claimApi.reimburseClaim(claimId, notes);
    }
  },
};

export default claimApi;
