import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Login = () => {
  const { login, signup, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
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

  const handleSignIn = async () => {
    await login();
  };

  const handleSignUp = async () => {
    await signup();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-aerox-blue/5 to-aerox-blue/1 flex flex-col">
      <Header />

      <main className="flex-grow py-8 md:py-16 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-aerox-blue/10 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-aerox-blue/10 rounded-full flex items-center justify-center mx-auto mb-4 text-aerox-blue">
                <ShieldCheck className="h-8 w-8" />
              </div>

              <h1 className="text-2xl font-bold text-aerox-blue mb-2">Secure Authentication</h1>
              <p className="text-gray-500 text-sm mb-8">
                Sign in or register securely using Auth0 OpenID Connect. Your credentials are verified externally and never handled or stored by this application.
              </p>

              <div className="space-y-4">
                <Button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-aerox-blue to-aerox-blue/90 hover:from-aerox-blue/90 hover:to-aerox-blue text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <LogIn className="h-5 w-5" />
                  Continue with Auth0 (Sign In)
                </Button>

                <Button
                  type="button"
                  onClick={handleSignUp}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-aerox-blue text-aerox-blue hover:bg-aerox-blue/5 px-8 py-3 rounded-lg shadow transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <UserPlus className="h-5 w-5" />
                  Create Account (Sign Up)
                </Button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
                Protected by Auth0 Universal Login & PKCE
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;
