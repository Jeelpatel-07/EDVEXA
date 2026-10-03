import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import authApi from "../api/authApi";
import { ROLES } from "../constants/permissions";

const AuthContext = createContext(null);
const emptySession = {
  user: null, organization: null, organizations: [], roles: [], permissions: [],
  membership: null, persona_label: "GUEST", is_member: false,
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(emptySession);
  const [loading, setLoading] = useState(true);
  const applySession = useCallback((data) => {
    if (!data?.user) { setSession(emptySession); return; }
    setSession({
      user: data.user, organization: data.organization || null,
      organizations: data.organizations || [],
      roles: Array.isArray(data.roles) ? data.roles : [],
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      membership: data.membership || null,
      persona_label: data.persona_label || "GUEST", is_member: Boolean(data.is_member),
    });
  }, []);
  const refreshSession = useCallback(async () => {
    const data = await authApi.getCurrentUser();
    applySession(data);
    return data;
  }, [applySession]);

  useEffect(() => {
    let alive = true;
    authApi.getCurrentUser()
      .then((data) => { if (alive) applySession(data); })
      .catch(() => { if (alive) applySession(null); })
      .finally(() => { if (alive) setLoading(false); });
    const unauthorized = () => applySession(null);
    window.addEventListener("edvexa:unauthorized", unauthorized);
    return () => {
      alive = false;
      window.removeEventListener("edvexa:unauthorized", unauthorized);
    };
  }, [applySession]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try { await authApi.login(credentials); return await refreshSession(); }
    finally { setLoading(false); }
  }, [refreshSession]);

  const switchOrganization = useCallback(async (id) => {
    setLoading(true);
    try { const data = await authApi.selectOrg(id); applySession(data); return data; }
    finally { setLoading(false); }
  }, [applySession]);

  const logout = useCallback(async () => {
    // A failed network request must not pretend the server session was revoked.
    await authApi.logout();
    applySession(null);
  }, [applySession]);

  const isAuthenticated = Boolean(session.user);
  const hasRole = useCallback((role) => session.roles.includes(role), [session.roles]);
  const hasAnyRole = useCallback((roles = []) => roles.some((r) => session.roles.includes(r)), [session.roles]);
  const hasPermission = useCallback((permission) => !permission || session.permissions.includes(permission), [session.permissions]);
  const hasAnyPermission = useCallback((permissions = []) => !permissions.length ||
    permissions.some((p) => session.permissions.includes(p)), [session.permissions]);
  const isMember = useCallback(() => session.is_member, [session.is_member]);
  const isGuest = useCallback(() => isAuthenticated && !session.is_member, [isAuthenticated, session.is_member]);
  const isPlatformAdmin = useCallback(() => session.roles.includes(ROLES.PLATFORM_ADMIN), [session.roles]);
  const hasStaffAccess = session.roles.some((r) =>
    [ROLES.ORG_ADMIN, ROLES.TREASURER, ROLES.EVENT_MANAGER, ROLES.GATE_STAFF, ROLES.VOLUNTEER].includes(r));

  const value = useMemo(() => ({
    ...session, isAuthenticated, isLoading: loading, loading,
    login, switchOrganization, logout, refreshSession,
    hasRole, hasAnyRole, hasPermission, hasAnyPermission,
    isMember, isGuest, isPlatformAdmin, hasStaffAccess,
  }), [session, isAuthenticated, loading, login, switchOrganization, logout,
    refreshSession, hasRole, hasAnyRole, hasPermission, hasAnyPermission,
    isMember, isGuest, isPlatformAdmin, hasStaffAccess]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
export default AuthContext;
