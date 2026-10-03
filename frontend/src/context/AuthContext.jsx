import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import authApi from "../api/authApi";
import { ROLES } from "../constants/permissions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    user: null,
    organization: null,
    roles: [],
    permissions: [],
    membership: null,
    persona_label: "GUEST",
    is_member: false,
  });
  const [loading, setLoading] = useState(true);

  // Apply authenticated session data
  const applySession = useCallback((data) => {
    if (!data || !data.user) {
      setSession({
        user: null,
        organization: null,
        roles: [],
        permissions: [],
        membership: null,
        persona_label: "GUEST",
        is_member: false,
      });
      return;
    }

    const roles = Array.isArray(data.roles) ? data.roles : [];
    const permissions = Array.isArray(data.permissions) ? data.permissions : [];

    setSession({
      user: data.user,
      organization: data.organization || null,
      roles,
      permissions,
      membership: data.membership || null,
      persona_label: data.persona_label || (data.is_member ? "MEMBER" : "GUEST"),
      is_member: Boolean(data.is_member),
    });
  }, []);

  // Initialize auth state from live backend session
  const refreshSession = useCallback(async () => {
    try {
      const data = await authApi.getCurrentUser();
      applySession(data);
      return data;
    } catch (err) {
      applySession(null);
      return null;
    }
  }, [applySession]);

  useEffect(() => {
    async function initAuth() {
      try {
        await refreshSession();
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen for unauthorized 401 events from Axios client
    const handleUnauthorized = () => {
      applySession(null);
    };

    window.addEventListener("edvexa:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("edvexa:unauthorized", handleUnauthorized);
  }, [applySession, refreshSession]);

  // Standard Login (email + password only)
  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await authApi.login(credentials);
      // Fetch fresh /auth/me for live permissions and membership
      const meData = await authApi.getCurrentUser();
      applySession(meData);
      return meData;
    } finally {
      setLoading(false);
    }
  };

  // Switch Organization Context
  const switchOrganization = async (orgId) => {
    setLoading(true);
    try {
      await authApi.selectOrg(orgId);
      const meData = await authApi.getCurrentUser();
      applySession(meData);
      return meData;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      applySession(null);
    }
  };

  // Derived authorization checks
  const isAuthenticated = !!session.user;

  // MEMBER derived strictly from backend is_member
  const isMember = useCallback(() => {
    return Boolean(session.is_member);
  }, [session.is_member]);

  // GUEST is registered user without active membership
  const isGuest = useCallback(() => {
    return isAuthenticated && !session.is_member;
  }, [isAuthenticated, session.is_member]);

  // Explicit Role Checks
  const hasRole = useCallback(
    (role) => {
      return session.roles.includes(role);
    },
    [session.roles]
  );

  const hasAnyRole = useCallback(
    (roleList = []) => {
      return roleList.some((r) => session.roles.includes(r));
    },
    [session.roles]
  );

  // Platform Admin Check
  const isPlatformAdmin = useCallback(() => {
    return session.roles.includes(ROLES.PLATFORM_ADMIN);
  }, [session.roles]);

  // Permission Checks (Union of permissions loaded live from DB)
  const hasPermission = useCallback(
    (permission) => {
      if (!permission) return true;
      // Org admin has broad authority
      if (session.roles.includes(ROLES.ORG_ADMIN)) return true;
      return session.permissions.includes(permission);
    },
    [session.permissions, session.roles]
  );

  const hasAnyPermission = useCallback(
    (permissionList = []) => {
      if (!permissionList || permissionList.length === 0) return true;
      if (session.roles.includes(ROLES.ORG_ADMIN)) return true;
      return permissionList.some((p) => session.permissions.includes(p));
    },
    [session.permissions, session.roles]
  );

  // Staff access: true if user holds ANY explicit organization staff role
  const hasStaffAccess = useMemo(() => {
    return session.roles.some((r) =>
      [
        ROLES.ORG_ADMIN,
        ROLES.TREASURER,
        ROLES.EVENT_MANAGER,
        ROLES.GATE_STAFF,
        ROLES.VOLUNTEER,
      ].includes(r)
    );
  }, [session.roles]);

  const value = useMemo(
    () => ({
      user: session.user,
      organization: session.organization,
      roles: session.roles,
      permissions: session.permissions,
      membership: session.membership,
      persona_label: session.persona_label,
      is_member: session.is_member,
      isAuthenticated,
      isLoading: loading,
      loading,
      login,
      switchOrganization,
      logout,
      refreshSession,
      hasRole,
      hasAnyRole,
      hasPermission,
      hasAnyPermission,
      isMember,
      isGuest,
      isPlatformAdmin,
      hasStaffAccess,
    }),
    [
      session,
      isAuthenticated,
      loading,
      refreshSession,
      hasRole,
      hasAnyRole,
      hasPermission,
      hasAnyPermission,
      isMember,
      isGuest,
      isPlatformAdmin,
      hasStaffAccess,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
