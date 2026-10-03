import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import authApi from "../api/authApi";
import {
  ROLES,
  PERMISSIONS,
  computePermissionsForRoles,
  isMembershipActive,
} from "../constants/permissions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    user: null,
    organization: null,
    roles: [],
    permissions: [],
    membership: null,
    personaKey: null,
    personaTitle: null,
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
        personaKey: null,
        personaTitle: null,
      });
      return;
    }

    const roles = Array.isArray(data.roles) ? data.roles : [];
    // Ensure permissions are the authoritative union of permissions
    const permissions =
      Array.isArray(data.permissions) && data.permissions.length > 0
        ? Array.from(new Set([...data.permissions, ...computePermissionsForRoles(roles)]))
        : computePermissionsForRoles(roles);

    setSession({
      user: data.user,
      organization: data.organization || null,
      roles,
      permissions,
      membership: data.membership || null,
      personaKey: data.personaKey || null,
      personaTitle: data.personaTitle || null,
    });
  }, []);

  // Initialize auth state from storage or default demo
  const refreshSession = useCallback(async () => {
    try {
      const data = await authApi.getCurrentUser();
      applySession(data);
      return data;
    } catch (err) {
      console.error("Session refresh failed:", err);
      applySession(null);
      return null;
    }
  }, [applySession]);

  useEffect(() => {
    async function initAuth() {
      try {
        const token = localStorage.getItem("edvexa_token");
        if (token) {
          await refreshSession();
        } else {
          // In development demo mode, initialize with default Org Admin
          const data = await authApi.getCurrentUser();
          applySession(data);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen for unauthorized 401 events from Axios client (Section 34)
    const handleUnauthorized = () => {
      applySession(null);
    };

    window.addEventListener("edvexa:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("edvexa:unauthorized", handleUnauthorized);
  }, [applySession, refreshSession]);

  // Standard Login
  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await authApi.login(credentials);
      applySession(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Demo Persona Login (Section 21 & 45: Real backend session, no local fake mutations)
  const loginAsPersona = async (personaKey) => {
    setLoading(true);
    try {
      const data = await authApi.loginAsPersona(personaKey);
      applySession(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Switch Organization Context (Section 29)
  const switchOrganization = async (orgId) => {
    setLoading(true);
    try {
      const data = await authApi.switchOrganization(orgId);
      applySession(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Logout (Section 36)
  const logout = () => {
    authApi.logout();
    applySession(null);
  };

  // Derived authorization checks
  const isAuthenticated = !!session.user;

  // Section 8: MEMBER derived strictly from active paid membership
  const isMember = useCallback(() => {
    return isMembershipActive(session.membership);
  }, [session.membership]);

  // Section 9: GUEST is registered user without active membership
  const isGuest = useCallback(() => {
    return isAuthenticated && !isMembershipActive(session.membership);
  }, [isAuthenticated, session.membership]);

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

  // Platform Admin Check (Section 11)
  const isPlatformAdmin = useCallback(() => {
    return session.roles.includes(ROLES.PLATFORM_ADMIN);
  }, [session.roles]);

  // Permission Checks (Section 6 & 18: Union of permissions)
  const hasPermission = useCallback(
    (permission) => {
      if (!permission) return true;
      return session.permissions.includes(permission);
    },
    [session.permissions]
  );

  const hasAnyPermission = useCallback(
    (permissionList = []) => {
      if (!permissionList || permissionList.length === 0) return true;
      return permissionList.some((p) => session.permissions.includes(p));
    },
    [session.permissions]
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
      personaKey: session.personaKey,
      personaTitle: session.personaTitle,
      isAuthenticated,
      isLoading: loading,
      loading, // backwards compatibility
      login,
      loginAsPersona,
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
