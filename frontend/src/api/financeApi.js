import apiClient from "./client";
import { MOCK_FINANCE } from "./mockData";

export const financeApi = {
  getSummary: async () => {
    try {
      return await apiClient.get("/finance/summary");
    } catch {
      return MOCK_FINANCE;
    }
  },

  getLedgerEntries: async (params = {}) => {
    try {
      return await apiClient.get("/finance/entries", { params });
    } catch {
      return MOCK_FINANCE.ledger;
    }
  },

  createEntry: async (entryData) => {
    try {
      return await apiClient.post("/finance/entries", entryData);
    } catch {
      const amount = parseFloat(entryData.amount);
      const isExpense = entryData.type === "EXPENSE";
      const finalAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);

      const newEntry = {
        id: "led_" + Date.now(),
        date: entryData.date || new Date().toISOString().split("T")[0],
        type: entryData.type,
        source: entryData.source,
        description: entryData.description,
        amount: finalAmount,
        ref: entryData.ref || `MAN-${Date.now().toString().slice(-4)}`
      };

      MOCK_FINANCE.ledger.unshift(newEntry);
      if (isExpense) {
        MOCK_FINANCE.otherExpenses += Math.abs(amount);
        MOCK_FINANCE.closingCash -= Math.abs(amount);
      } else {
        MOCK_FINANCE.moneyReceived += Math.abs(amount);
        MOCK_FINANCE.closingCash += Math.abs(amount);
      }

      return newEntry;
    }
  },

  getReports: async (reportType = "MONTHLY", dateRange = {}) => {
    try {
      return await apiClient.get("/finance/reports", { params: { reportType, ...dateRange } });
    } catch {
      return {
        reportType,
        generatedAt: new Date().toISOString(),
        summary: MOCK_FINANCE,
        breakdownByMonth: [
          { month: "Aug 2026", income: 3200, expenses: 1400, net: 1800 },
          { month: "Sep 2026", income: 4800, expenses: 1950, net: 2850 },
          { month: "Oct 2026 (MTD)", income: 5630, expenses: 1145.5, net: 4484.5 }
        ]
      };
    }
  }
};

export default financeApi;
