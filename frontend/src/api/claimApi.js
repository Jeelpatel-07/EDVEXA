import apiClient from "./client";
import { MOCK_CLAIMS, MOCK_FINANCE } from "./mockData";

export const claimApi = {
  getMyClaims: async () => {
    try {
      return await apiClient.get("/claims/my");
    } catch {
      return MOCK_CLAIMS;
    }
  },

  getClaimById: async (id) => {
    try {
      return await apiClient.get(`/claims/${id}`);
    } catch {
      return MOCK_CLAIMS.find((c) => c.id === id || c.claimNumber === id) || MOCK_CLAIMS[0];
    }
  },

  submitClaim: async (claimData) => {
    try {
      return await apiClient.post("/claims", claimData);
    } catch {
      const newClaim = {
        id: "clm_" + Date.now(),
        claimNumber: "CLM-2026-0" + Math.floor(100 + Math.random() * 900),
        claimantId: "usr_1",
        claimantName: "Alex Rivera",
        purpose: claimData.purpose,
        category: claimData.category,
        amount: parseFloat(claimData.amount),
        status: "UNDER_REVIEW",
        receiptUrl: claimData.receiptUrl || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80",
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        treasurerNotes: ""
      };
      MOCK_CLAIMS.unshift(newClaim);
      return newClaim;
    }
  },

  // Treasurer / Staff endpoints
  getAllClaims: async (params = {}) => {
    try {
      return await apiClient.get("/claims", { params });
    } catch {
      return MOCK_CLAIMS;
    }
  },

  reviewClaim: async (claimId, { status, notes, approvedAmount }) => {
    try {
      return await apiClient.patch(`/claims/${claimId}/review`, { status, notes, approvedAmount });
    } catch {
      const claim = MOCK_CLAIMS.find((c) => c.id === claimId);
      if (claim) {
        claim.status = status; // APPROVED, REJECTED, REIMBURSED
        claim.treasurerNotes = notes;
        claim.reviewedAt = new Date().toISOString();
        claim.reviewedBy = "Treasurer Council (You)";

        if (status === "REIMBURSED") {
          // Linked to finance!
          MOCK_FINANCE.reimbursements += claim.amount;
          MOCK_FINANCE.closingCash -= claim.amount;
          MOCK_FINANCE.ledger.unshift({
            id: "led_" + Date.now(),
            date: new Date().toISOString().split("T")[0],
            type: "EXPENSE",
            source: "Reimbursement",
            description: `${claim.claimantName} - ${claim.claimNumber} ${claim.purpose}`,
            amount: -claim.amount,
            ref: claim.claimNumber
          });
        }
      }
      return { success: true, claimId, status, notes };
    }
  }
};

export default claimApi;
