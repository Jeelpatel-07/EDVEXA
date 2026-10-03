import apiClient, { setAccessToken, setCurrentOrgId } from "./axios";

export const authApi = {
  login: async (credentials) => {
    const data = await apiClient.post("/auth/login", {
      email: credentials.email,
      password: credentials.password,
    });
    if (data?.access_token) {
      setAccessToken(data.access_token);
    }
    if (data?.organization?.id) {
      setCurrentOrgId(data.organization.id);
    }
    return data;
  },

  getCurrentUser: async () => {
    const data = await apiClient.get("/auth/me");
    if (data?.organization?.id) {
      setCurrentOrgId(data.organization.id);
    }
    return data;
  },

  register: async (formData) => {
    // Strictly omit role/roles field to comply with R4
    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      student_id: formData.studentId || formData.student_id || undefined,
      join_code: formData.joinCode || formData.join_code || undefined,
    };
    return await apiClient.post("/auth/register", payload);
  },

  verifyEmail: async (token) => {
    return await apiClient.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  },

  resendVerification: async (email) => {
    return await apiClient.post("/auth/resend-verification", { email });
  },

  acceptInvite: async ({ token, password, full_name }) => {
    const data = await apiClient.post("/auth/accept-invite", {
      token,
      password,
      full_name,
    });
    if (data?.access_token) {
      setAccessToken(data.access_token);
    }
    return data;
  },

  forgotPassword: async (email) => {
    return await apiClient.post("/auth/forgot-password", { email });
  },

  resetPassword: async ({ token, new_password }) => {
    return await apiClient.post("/auth/reset-password", {
      token,
      new_password,
    });
  },

  changePassword: async ({ current_password, new_password }) => {
    return await apiClient.post("/auth/change-password", {
      current_password,
      new_password,
    });
  },

  selectOrg: async (organization_id) => {
    const data = await apiClient.post("/auth/select-org", { organization_id });
    if (data?.access_token) {
      setAccessToken(data.access_token);
    }
    setCurrentOrgId(organization_id);
    return data;
  },

  getSessions: async () => {
    return await apiClient.get("/auth/sessions");
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  logoutAll: async () => {
    try {
      await apiClient.post("/auth/logout-all");
    } finally {
      setAccessToken(null);
    }
  },
};

export default authApi;
