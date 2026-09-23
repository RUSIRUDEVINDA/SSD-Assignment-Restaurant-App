import React, { createContext, useState, useEffect, useContext, useMemo, useRef, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { User } from "../types";
import { setAuthTokenGetter, getMyProfile } from "../utils/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  loginWithRedirect: (options?: Record<string, unknown>) => Promise<void>;
  signup: () => Promise<void>;
  logout: () => void;
  getAccessTokenSilently: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  loginWithRedirect: async () => {},
  signup: async () => {},
  logout: () => {},
  getAccessTokenSilently: async () => null,
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth0 = useAuth0();
  const [user, setUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sequence counter to prevent race conditions and ignore stale in-flight responses
  const activeRequestIdRef = useRef<number>(0);

  const { isAuthenticated, user: auth0User, isLoading: auth0Loading, getAccessTokenSilently: auth0GetToken, loginWithRedirect: auth0LoginWithRedirect, logout: auth0Logout } = auth0;

  // Wire token getter to API client so protected requests attach Bearer tokens automatically
  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (isAuthenticated) {
        try {
          return await auth0GetToken();
        } catch {
          return null;
        }
      }
      return null;
    });
  }, [isAuthenticated, auth0GetToken]);

  /**
   * Load backend application profile from GET /api/me using verified Auth0 access token.
   * Derives role, internal ID, and restaurant assignment strictly from the authoritative database.
   */
  const loadProfile = useCallback(async () => {
    if (!isAuthenticated || !auth0User) {
      activeRequestIdRef.current += 1;
      setUser(null);
      setAuthError(null);
      setIsProfileLoading(false);
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    setIsProfileLoading(true);
    setAuthError(null);

    try {
      // 1. Obtain verified access token for backend API explicitly
      const token = await auth0GetToken();
      if (requestId !== activeRequestIdRef.current) return;

      if (!token) {
        setUser(null);
        setAuthError("Authentication required: access token unavailable.");
        setIsProfileLoading(false);
        return;
      }

      // 2. Fetch authoritative profile from /api/me using token
      const profile = await getMyProfile(token);
      if (requestId !== activeRequestIdRef.current) return;

      // 3. Build application user context using internal MongoDB ID and backend role
      const phoneVal = (auth0User as { phone_number?: string }).phone_number || "";
      const appUser: User = {
        id: profile.id, // Stable internal MongoDB identifier
        name: profile.displayName || auth0User.name || auth0User.nickname || auth0User.email || "User",
        email: auth0User.email || "",
        phone: phoneVal,
        type: profile.role, // Explicitly map backend role to UI type
        ...(profile.restaurantId ? { restaurantId: profile.restaurantId } : {}),
      };

      setUser(appUser);
      setAuthError(null);
    } catch (err: unknown) {
      if (requestId !== activeRequestIdRef.current) return;

      // Fail closed: never fall back to demo profiles
      setUser(null);

      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 403) {
        const msg = axiosErr.response?.data?.message || "";
        if (msg.toLowerCase().includes("inactive")) {
          setAuthError("Access denied: your account is inactive. Please contact support.");
        } else {
          setAuthError("Access denied: account not provisioned. Please contact an administrator.");
        }
      } else if (axiosErr.response?.status === 401) {
        setAuthError("Session expired or authentication failed. Please sign in again.");
      } else {
        setAuthError("Unable to load application profile due to a backend or network error.");
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsProfileLoading(false);
      }
    }
  }, [isAuthenticated, auth0User, auth0GetToken]);

  useEffect(() => {
    if (auth0Loading) {
      return;
    }

    if (isAuthenticated && auth0User) {
      loadProfile();
    } else {
      activeRequestIdRef.current += 1;
      setUser(null);
      setAuthError(null);
      setIsProfileLoading(false);
    }
  }, [auth0Loading, isAuthenticated, auth0User, loadProfile]);

  // Auth0 Universal Login redirect
  const login = useCallback(async (): Promise<void> => {
    await auth0LoginWithRedirect();
  }, [auth0LoginWithRedirect]);

  // Auth0-hosted signup redirect
  const signup = useCallback(async (): Promise<void> => {
    await auth0LoginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
      },
    });
  }, [auth0LoginWithRedirect]);

  // Auth0 logout: immediately clear local application state and cancel pending fetches
  const logout = useCallback(() => {
    activeRequestIdRef.current += 1;
    setUser(null);
    setAuthError(null);
    setIsProfileLoading(false);
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout]);

  const getAccessTokenSilently = useCallback(async (): Promise<string | null> => {
    try {
      return await auth0GetToken();
    } catch {
      return null;
    }
  }, [auth0GetToken]);

  const combinedLoading = auth0Loading || (isAuthenticated && isProfileLoading);

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading: combinedLoading,
    error: authError,
    login,
    loginWithRedirect: auth0LoginWithRedirect,
    signup,
    logout,
    getAccessTokenSilently,
    refreshProfile: loadProfile,
  }), [
    user,
    isAuthenticated,
    combinedLoading,
    authError,
    login,
    auth0LoginWithRedirect,
    signup,
    logout,
    getAccessTokenSilently,
    loadProfile,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
