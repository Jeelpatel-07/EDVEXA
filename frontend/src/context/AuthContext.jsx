import { createContext, useContext, useState, useEffect } from "react";
import authApi from "../api/authApi";
import { MOCK_USERS } from "../api/mockData";

const AuthContext = createContext(null);

export const ROLE_PERMISSIONS = {
  Student: {
    canAccessStaff: false,
    canManageEvents: false,
    canManageMembers: false,
    canManageShop: false,
    canCheckIn: false,
    canReviewClaims: false,
    canViewFinance: false,
    canManageUsers: false,
  },
  Volunteer: {
    canAccessStaff: true,
    canManageEvents: false,
    canManageMembers: false,
    canManageShop: false,
    canCheckIn: true,
    canReviewClaims: false,
    canViewFinance: false,
    canManageUsers: false,
  },
  "Gate Staff": {
    canAccessStaff: true,
    canManageEvents: false,
    canManageMembers: false,
    canManageShop: false,
    canCheckIn: true,
    canReviewClaims: false,
    canViewFinance: false,
    canManageUsers: false,
  },
  "Event Manager": {
    canAccessStaff: true,
    canManageEvents: true,
    canManageMembers: false,
    canManageShop: false,
    canCheckIn: true,
    canReviewClaims: false,
    canViewFinance: false,
    canManageUsers: false,
  },
  Treasurer: {
    canAccessStaff: true,
    canManageEvents: false,
    canManageMembers: true,
    canManageShop: true,
    canCheckIn: false,
    canReviewClaims: true,
    canViewFinance: true,
    canManageUsers: false,
  },
  Administrator: {
    canAccessStaff: true,
    canManageEvents: true,
    canManageMembers: true,
    canManageShop: true,
    canCheckIn: true,
    canReviewClaims: true,
    canViewFinance: true,
    canManageUsers: true,
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState("Administrator");
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    async function initAuth() {
      try {
        const token = localStorage.getItem("edvexa_token");
        if (token) {
          const profile = await authApi.getCurrentUser();
          setUser(profile);
          setActiveRole(profile.activeRole || profile.roles?.[0] || "Student");
        } else {
          // In development/demo, initialize with default lead user
          const defaultUser = MOCK_USERS[0];
          setUser(defaultUser);
          setActiveRole(defaultUser.activeRole || "Administrator");
          localStorage.setItem("edvexa_token", "demo_token_usr_1");
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen for unauthorized events from API client
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener("edvexa:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("edvexa:unauthorized", handleUnauthorized);
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await authApi.login(credentials);
      const loggedUser = res.user || MOCK_USERS.find((u) => u.email === credentials.email) || MOCK_USERS[0];
      setUser(loggedUser);
      setActiveRole(loggedUser.activeRole || loggedUser.roles?.[0] || "Student");
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setActiveRole("Student");
  };

  const switchActiveRole = (newRole) => {
    if (user?.roles?.includes(newRole)) {
      setActiveRole(newRole);
    }
  };

  // Compute permissions for the current active role (or union of roles if desired)
  const permissions = ROLE_PERMISSIONS[activeRole] || ROLE_PERMISSIONS.Student;
  const hasStaffAccess = user?.roles?.some((r) => r !== "Student") || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        roles: user?.roles || ["Student"],
        activeRole,
        switchActiveRole,
        permissions,
        hasStaffAccess,
        membership: user?.membership,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
