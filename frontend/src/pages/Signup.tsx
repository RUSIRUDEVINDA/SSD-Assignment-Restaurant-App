import React from "react";
import { Link } from "react-router-dom";
import { UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Signup = () => {
  const { signup, isLoading } = useAuth();

  const handleSignUp = async () => {
    await signup();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-aerox-blue/5 to-aerox-blue/1 flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="w-12 h-12 bg-aerox-blue/10 rounded-full flex items-center justify-center mx-auto mb-2 text-aerox-blue">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-aerox-blue">
                Create an Account
              </CardTitle>
              <CardDescription className="text-gray-500">
                Account creation is securely hosted by Auth0 Universal Login. Passwords and credentials are never handled or stored by this application.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <Button
                type="button"
                onClick={handleSignUp}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-aerox-blue to-aerox-blue/90 hover:from-aerox-blue/90 hover:to-aerox-blue text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <UserPlus className="h-5 w-5" />
                Sign Up with Auth0
              </Button>
            </CardContent>

            <CardFooter className="text-center pt-4">
              <p className="text-gray-500 text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-aerox-blue hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Signup;
