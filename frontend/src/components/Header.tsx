import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ShoppingCart, 
  Menu, 
  X, 
  LogIn, 
  LogOut, 
  User as UserIcon,
  Plane
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const redirectToDashboard = () => {
    if (!user) return;

    if (user.type === "mainAdmin") {
      navigate("/admin");
    } else if (user.type === "admin" && user.restaurantId) {
      navigate(`/admin/restaurant/${user.restaurantId}`);
    } else {
      navigate("/profile");
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-aerox-blue text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between py-4 px-4 md:px-6">
        {/* Logo & Brand with Airplane */}
        <Link to="/" className="flex items-center space-x-2">
          <Plane className="h-8 w-8 text-white" />
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white">AeroX</span>
            <span className="text-xs tracking-wide -mt-1">Airport Dining</span>
          </div>
        </Link>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="hover:text-aerox-gold transition">Home</Link>
          <Link to="/restaurants" className="hover:text-aerox-gold transition">Restaurants</Link>
          
          {isAuthenticated && (
            <Button 
              variant="ghost" 
              className="text-white hover:text-aerox-gold hover:bg-transparent"
              onClick={redirectToDashboard}
            >
              {user?.type === "customer" ? "My Profile" : "Dashboard"}
            </Button>
          )}
          
          <button 
            onClick={() => navigate("/cart")} 
            className="relative hover:text-aerox-gold transition"
          >
            <ShoppingCart className="h-6 w-6" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-aerox-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <Button 
              variant="ghost" 
              className="text-white hover:text-aerox-gold hover:bg-transparent"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              className="text-white hover:text-aerox-gold hover:bg-transparent"
              onClick={() => navigate("/login")}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
          )}
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-aerox-blue border-t border-aerox-blue/20 pb-4">
          <div className="container mx-auto px-4 flex flex-col space-y-3 pt-2">
            <Link 
              to="/" 
              className="py-2 hover:text-aerox-gold transition"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/restaurants" 
              className="py-2 hover:text-aerox-gold transition"
              onClick={() => setIsMenuOpen(false)}
            >
              Restaurants
            </Link>
            
            {isAuthenticated && (
              <Button 
                variant="ghost" 
                className="text-white hover:text-aerox-gold justify-start hover:bg-transparent px-0"
                onClick={redirectToDashboard}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                {user?.type === "customer" ? "My Profile" : "Dashboard"}
              </Button>
            )}
            
            <button 
              onClick={() => {
                navigate("/cart");
                setIsMenuOpen(false);
              }} 
              className="py-2 hover:text-aerox-gold transition flex items-center"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart
              {totalItems > 0 && (
                <span className="ml-2 bg-aerox-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <Button 
                variant="ghost" 
                className="text-white hover:text-aerox-gold justify-start hover:bg-transparent px-0"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                className="text-white hover:text-aerox-gold justify-start hover:bg-transparent px-0"
                onClick={() => {
                  navigate("/login");
                  setIsMenuOpen(false);
                }}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
