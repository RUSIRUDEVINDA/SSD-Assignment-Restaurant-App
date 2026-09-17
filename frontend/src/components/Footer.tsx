
import React from "react";
import { Link } from "react-router-dom";
import { UtilityPole, Facebook, Twitter, Instagram, Mail, Phone } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-aerox-blue text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
             {/*} <UtilityPole className="h-8 w-8 text-aerox-gold" />*/}
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-aerox-gold">AeroX</span>
                <span className="text-xs tracking-wide -mt-1">Airport Dining</span>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              Making airport dining convenient and delightful with pre-ordering and restaurant reservations.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-aerox-gold">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-aerox-gold">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-aerox-gold">
                <Instagram size={20} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-aerox-gold">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white">Home</Link>
              </li>
              <li>
                <Link to="/restaurants" className="text-gray-300 hover:text-white">Restaurants</Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-300 hover:text-white">Login</Link>
              </li>
              <li>
                <Link to="/cart" className="text-gray-300 hover:text-white">Cart</Link>
              </li>
            </ul>
          </div>
          
          {/* Restaurant Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-aerox-gold">Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/restaurants?category=Café" className="text-gray-300 hover:text-white">Cafés</Link>
              </li>
              <li>
                <Link to="/restaurants?category=Fast Food" className="text-gray-300 hover:text-white">Fast Food</Link>
              </li>
              <li>
                <Link to="/restaurants?category=Beverages" className="text-gray-300 hover:text-white">Beverages</Link>
              </li>
              <li>
                <Link to="/restaurants?category=Fine Dining" className="text-gray-300 hover:text-white">Fine Dining</Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-aerox-gold">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center">
                <Phone size={18} className="mr-2 text-aerox-gold" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center">
                <Mail size={18} className="mr-2 text-aerox-gold" />
                <span>contact@aerox.com</span>
              </li>
              <li>
                <p className="text-sm">
                  Terminal 1, 2, & 3<br />
                  International Airport<br />
                  United States
                </p>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} AeroX Airport Dining. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
