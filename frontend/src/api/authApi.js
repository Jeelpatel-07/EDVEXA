import apiClient, {
  clearSession, getAccessToken, loginSession, logoutSession, refreshAccess, setCurrentOrgId,
} from "./axios";

const applyOrganization = (data) => {
  setCurrentOrgId(data?.organization?.id || null);
  return data;
};
export const authApi = {
  login: (credentials) => loginSession({ email: credentials.email, password: credentials.password }),
  getCurrentUser: async () => {
    if (!getAccessToken()) await refreshAccess();
    return applyOrganization(await apiClient.get("/auth/context"));
  },
  register: (form) => apiClient.post("/auth/register", {
    full_name: form.name, email: form.email, password: form.password,
    join_code: form.joinCode?.trim() || undefined,
    student_id: form.studentId?.trim() || undefined,
  }),
  verifyEmail: (token) => apiClient.post("/auth/verify-email", { token }),
  resendVerification: (email) => apiClient.post("/auth/resend-verification", { email }),
  forgotPassword: (email) => apiClient.post("/auth/forgot-password", { email }),
  resetPassword: ({ token, new_password }) => apiClient.post("/auth/reset-password", { token, new_password }),
  acceptInvite: (data) => apiClient.post("/auth/accept-invite", data),
  selectOrg: async (organization_id) => applyOrganization(await apiClient.post("/auth/select-org", { organization_id })),
  joinOrg: async (data) => applyOrganization(await apiClient.post("/auth/join-org", data)),
  changePassword: async (data) => {
    const result = await apiClient.post("/auth/change-password", data);
    clearSession();
    window.dispatchEvent(new CustomEvent("edvexa:unauthorized"));
    return result;
  },
  getSessions: () => apiClient.get("/auth/sessions"),
  logout: logoutSession,
  logoutAll: async () => {
    await apiClient.post("/auth/logout-all");
    clearSession();
    window.dispatchEvent(new CustomEvent("edvexa:unauthorized"));
  },
};
export default authApi;
