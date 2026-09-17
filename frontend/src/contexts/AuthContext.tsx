
import React, { createContext, useState, useEffect, useContext } from "react";
import { toast } from "sonner";
import { User } from "../types";
import { getUserByEmail, demoLogins } from "../data/users";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved user on mount
    const savedUser = localStorage.getItem("aeroxUser");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        localStorage.removeItem("aeroxUser");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Check if email/password combination exists in demo logins
      const loginMatch = demoLogins.find(
        login => login.email === email && login.password === password
      );
      
      if (!loginMatch) {
        toast.error("Invalid email or password");
        return false;
      }
      
      // Get the user data
      const userData = getUserByEmail(email);
      
      if (!userData) {
        toast.error("User not found");
        return false;
      }
      
      // Success - save user to state and localStorage
      setUser(userData);
      localStorage.setItem("aeroxUser", JSON.stringify(userData));
      toast.success("Login successful");
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("aeroxUser");
    toast.info("You have been logged out");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
