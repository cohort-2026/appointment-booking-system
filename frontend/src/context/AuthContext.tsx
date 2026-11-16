import { clearBookingDraft } from "../lib/bookingDraft";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { verifyEmailOtp } from "../services/auth";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  role: string;
  soleProvider?: {
    id: string;
    displayName: string;
    serviceName?: string | null;
    category?: string | null;
    experience?: string | null;
    bio?: string | null;
    city?: string | null;
  } | null;
  business?: unknown;
  businessStaff?: unknown;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  verifyEmail: (email: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiFetch<{ success: boolean; user?: AuthUser }>("/auth/me");
      setUser(response.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<{ success: boolean; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setUser(response.user);
    setLoading(false);
    return response.user;
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const response = await verifyEmailOtp(email, code);

    setUser(response.user);
    setLoading(false);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      if (!clearBookingDraft()) console.warn("Could not clear the saved booking on this browser.");
      setUser(null);
      setLoading(false);
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      verifyEmail,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, loading, login, verifyEmail, logout, refreshUser, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export { AuthContext };
