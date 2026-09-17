import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, User, Lock, UtilityPole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { demoLogins } from "@/data/users";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.type === "mainAdmin") {
        navigate("/admin");
      } else if (user?.type === "admin" && user?.restaurantId) {
        navigate(`/admin/restaurant/${user.restaurantId}`);
      } else {
        navigate("/profile");
      }
    }
  }, [isAuthenticated, navigate, user]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email.trim() || !password.trim()) {
      setError("Both email and password are required");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate email length
    if (email.length < 5 || email.length > 255) {
      setError("Email must be between 5 and 255 characters");
      return;
    }

    // Validate password length
    if (password.length < 8 || password.length > 100) {
      setError("Password must be between 8 and 100 characters");
      return;
    }

    // Validate password complexity
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");
      return;
    }
    
    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    
    if (success) {
      // Navigation is handled in the useEffect
    }
  };
  
  const handleDemoLogin = async (demo: { email: string; password: string }) => {
    setEmail(demo.email);
    setPassword(demo.password);
    await login(demo.email, demo.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-aerox-blue/5 to-aerox-blue/1 flex flex-col">
      <Header />
      
      <main className="flex-grow py-8 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-aerox-blue/10">
            <div className="p-8">
              <h1 className="text-2xl font-bold text-center text-aerox-blue mb-6">Sign in to AeroX</h1>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    {error}
                  </div>
                )}
                
                <div>
                  <Label htmlFor="email" className="flex items-center text-gray-600">
                    <User className="h-4 w-4 mr-2 text-aerox-blue/70" /> Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aerox-blue focus:border-aerox-blue transition-all duration-200"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password" className="flex items-center text-gray-600">
                    <Lock className="h-4 w-4 mr-2 text-aerox-blue/70" /> Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aerox-blue focus:border-aerox-blue transition-all duration-200"
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-aerox-blue to-aerox-blue/90 hover:from-aerox-blue/90 hover:to-aerox-blue text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="flex items-center justify-center">
                  <div className="flex-1 h-px bg-gray-200 mx-4"></div>
                  <div className="flex-1 h-px bg-gray-200 mx-4"></div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;
