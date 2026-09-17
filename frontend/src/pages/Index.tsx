import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UtensilsCrossed, MapPin, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restaurants } from "@/data/restaurants";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestaurantCard from "@/components/RestaurantCard";

const Index = () => {
  // Show only 3 featured restaurants on the home page
  const featuredRestaurants = restaurants.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-aerox-blue text-white">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
              alt="Restaurant interior"
              className="w-full h-full object-cover opacity-20"
            />
          </div>
          
          <div className="relative container mx-auto px-4 py-12 md:py-20 flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Elevate Your <span className="text-white">Airport Dining</span> Experience
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mb-6">
              Pre-order your meals or reserve a table at your favorite airport restaurants. Skip the wait and enjoy a seamless dining experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Button asChild size="lg" className="bg-white text-aerox-blue hover:bg-white/90">
                <Link to="/restaurants">Explore Restaurants</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-aerox-blue hover:bg-white hover:text-aerox-blue">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-12 premium-section">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-10 premium-text-gradient">How AeroX Dining Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="flex flex-col items-center text-center p-5 rounded-lg premium-card backdrop-blur-sm bg-white/70">
                <div className="bg-aerox-blue/10 p-4 rounded-full mb-4">
                  <UtensilsCrossed className="h-7 w-7 text-aerox-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-aerox-blue">Pre-Order Food</h3>
                <p className="text-gray-600">
                  Browse menus from all airport restaurants and pre-order your food for pickup. Skip the line and save time.
                </p>
              </div>
              
              {/* Feature 2 */}
              <div className="flex flex-col items-center text-center p-5 rounded-lg premium-card backdrop-blur-sm bg-white/70">
                <div className="bg-aerox-blue/10 p-4 rounded-full mb-4">
                  <Calendar className="h-7 w-7 text-aerox-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-aerox-blue">Reserve a Table</h3>
                <p className="text-gray-600">
                  Make reservations at participating restaurants in advance. Guarantee your spot and enjoy your meal.
                </p>
              </div>
              
              {/* Feature 3 */}
              <div className="flex flex-col items-center text-center p-5 rounded-lg premium-card backdrop-blur-sm bg-white/70">
                <div className="bg-aerox-blue/10 p-4 rounded-full mb-4">
                  <MapPin className="h-7 w-7 text-aerox-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-aerox-blue">Find Locations</h3>
                <p className="text-gray-600">
                  Easily locate restaurants across all terminals with interactive maps and directions.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Featured Restaurants */}
        <section className="py-12 bg-gray-50/70 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold premium-text-gradient">Featured Restaurants</h2>
              <Link to="/restaurants" className="text-aerox-blue hover:text-aerox-blue/80 flex items-center font-medium">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredRestaurants.map(restaurant => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-12 premium-gradient text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Enhance Your Travel Dining?</h2>
            <p className="text-xl max-w-2xl mx-auto mb-6">
              Create an account to track your orders, make reservations, and enjoy a seamless airport dining experience.
            </p>
            <Button asChild size="lg" className="bg-white text-aerox-blue hover:bg-white/90">
              <Link to="/login">Get Started</Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
