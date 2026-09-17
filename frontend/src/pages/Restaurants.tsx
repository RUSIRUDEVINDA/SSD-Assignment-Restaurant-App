import React, { useState, useEffect } from "react";
import { restaurants } from "@/data/restaurants";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestaurantFilter from "@/components/RestaurantFilter";
import RestaurantCard from "@/components/RestaurantCard";
import { Restaurant } from "@/types";
import { Frown } from "lucide-react"; // Icon for empty state

const Restaurants = () => {
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(restaurants);
  const [currentFilters, setCurrentFilters] = useState({
    name: "",
    category: "",
    terminal: ""
  });

  useEffect(() => {
    const filtered = restaurants.filter(restaurant => {
      const nameMatch = currentFilters.name
        ? restaurant.name.toLowerCase().includes(currentFilters.name.toLowerCase())
        : true;
      const categoryMatch = currentFilters.category
        ? restaurant.category === currentFilters.category
        : true;
      const terminalMatch = currentFilters.terminal
        ? restaurant.terminal === currentFilters.terminal
        : true;

      return nameMatch && categoryMatch && terminalMatch;
    });

    setFilteredRestaurants(filtered);
  }, [currentFilters]);

  const handleFilterChange = (filters: { name: string; category: string; terminal: string }) => {
    setCurrentFilters(filters);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white/90 text-gray-800">
      <Header />

      {/* Page Content */}
      <main className="flex-grow container mx-auto px-6 lg:px-8 py-8">
        {/* Page Heading */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold premium-text-gradient mb-3">Explore Airport Restaurants</h1>
          <p className="text-lg text-gray-600">
            Discover amazing dining options across all terminals. Your next meal is just a few clicks away!
          </p>
        </div>

        {/* Filters Section - Removed card styling */}
        <div className="mb-8">
          <RestaurantFilter onFilterChange={handleFilterChange} restaurants={restaurants} />
        </div>

        {/* Results Grid - Always 3 Columns */}
        {filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredRestaurants.map(restaurant => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-16 bg-white/80 backdrop-blur-sm rounded-lg">
            <Frown size={64} className="text-aerox-blue/40 mb-6" />
            <h3 className="text-2xl font-semibold text-aerox-blue">No restaurants found</h3>
            <p className="text-gray-500 text-lg mt-4">
              Try adjusting your filters to see more options.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Restaurants;
