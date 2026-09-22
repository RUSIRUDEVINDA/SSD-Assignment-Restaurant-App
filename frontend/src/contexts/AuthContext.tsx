import React, { createContext, useState, useEffect, useContext, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { User } from "../types";
import { getUserByEmail } from "../data/users";
import { setAuthTokenGetter } from "../utils/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  loginWithRedirect: (options?: any) => Promise<void>;
  signup: () => Promise<void>;
  logout: () => void;
  getAccessTokenSilently: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  loginWithRedirect: async () => {},
  signup: async () => {},
  logout: () => {},
  getAccessTokenSilently: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth0 = useAuth0();
  const [user, setUser] = useState<User | null>(null);

  // Wire token getter to API client so protected requests attach Bearer tokens automatically
  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (auth0.isAuthenticated) {
        try {
          return await auth0.getAccessTokenSilently();
        } catch {
          return null;
        }
      }
      return null;
    });
  }, [auth0.isAuthenticated, auth0.getAccessTokenSilently]);

  // Normalize verified Auth0 identity claims into application User model
  useEffect(() => {
    if (auth0.isAuthenticated && auth0.user) {
      const email = auth0.user.email || "";
      // Check if an existing demo profile matches this email (for UI demo metadata display)
      const existingDemo = email ? getUserByEmail(email) : undefined;

      // Construct normalized user representation
      // For newly signed-up users not in users.ts, default safely to least-privileged 'customer' UI type
      const normalizedUser: User = existingDemo || {
        id: auth0.user.sub || `auth0|${email}`,
        name: auth0.user.name || auth0.user.nickname || (email ? email.split("@")[0] : "User"),
        email: email,
        phone: (auth0.user as any).phone_number || "",
        type: "customer", // Least-privileged default UI category; NOT a backend authorization control
      };
      setUser(normalizedUser);
    } else if (!auth0.isLoading) {
      setUser(null);
    }
  }, [auth0.isAuthenticated, auth0.user, auth0.isLoading]);

  // Auth0 Universal Login redirect
  const login = async (): Promise<void> => {
    await auth0.loginWithRedirect();
  };

  // Auth0-hosted signup redirect
  const signup = async (): Promise<void> => {
    await auth0.loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
      },
    });
  };

  // Auth0 logout
  const logout = () => {
    setUser(null);
    auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  const getAccessTokenSilently = async (): Promise<string | null> => {
    try {
      return await auth0.getAccessTokenSilently();
    } catch {
      return null;
    }
  };

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated: auth0.isAuthenticated,
    isLoading: auth0.isLoading,
    login,
    loginWithRedirect: auth0.loginWithRedirect,
    signup,
    logout,
    getAccessTokenSilently,
  }), [user, auth0.isAuthenticated, auth0.isLoading, auth0.loginWithRedirect]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
