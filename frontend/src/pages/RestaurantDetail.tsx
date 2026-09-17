import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  ExternalLink, 
  Calendar, 
  ChevronLeft,
  ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { restaurants } from "@/data/restaurants";
import { getMenuItemsByRestaurant } from "@/data/menu-items";
import { getTablesByRestaurant } from "@/data/tables";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {MenuItem} from "@/components/MenuItem";
import MenuFilter from "@/components/MenuFilter";
import TableReservation from "@/components/TableReservation";
import { Restaurant, MenuItem as MenuItemType } from "@/types";

const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItemType[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  
  // Fetch restaurant data
  useEffect(() => {
    if (id) {
      const foundRestaurant = restaurants.find(r => r.id === id);
      if (foundRestaurant) {
        setRestaurant(foundRestaurant);
        
        // Fetch menu items for this restaurant
        const items = getMenuItemsByRestaurant(id);
        setMenuItems(items);
        setFilteredMenuItems(items);
      }
    }
  }, [id]);
  
  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
            <Link to="/restaurants" className="text-aerox-blue hover:underline">
              Browse all restaurants
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Get tables for this restaurant
  const tables = getTablesByRestaurant(restaurant.id);
  
  return (
    <div className="min-h-screen flex flex-col bg-white/90">
      <Header />
      
      <main className="flex-grow">
        {/* Back button */}
        <div className="bg-gray-50/80 backdrop-blur-sm py-3">
          <div className="container mx-auto px-4">
            <Link to="/restaurants" className="text-aerox-blue hover:text-aerox-blue/80 flex items-center">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Restaurants
            </Link>
          </div>
        </div>
        
        {/* Restaurant Header */}
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img
            src={restaurant.images[2]}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-aerox-blue/90 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full p-6">
            <div className="container mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{restaurant.name}</h1>
              <div className="flex flex-wrap gap-4 text-white/90">
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Terminal {restaurant.terminal.split(" ")[1]}, Shop {restaurant.location.shopNumber}
                </span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {restaurant.hours.open} - {restaurant.hours.close}, {restaurant.hours.days}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Restaurant Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar with info */}
            <div className="lg:col-span-1">
              <div className="premium-card rounded-lg p-5 mb-6">
                <h3 className="text-xl font-semibold mb-4 text-aerox-blue">Information</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-aerox-blue mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-aerox-blue/90">Location</h4>
                      <p className="text-gray-600">Shop {restaurant.location.shopNumber}</p>
                      <p className="text-gray-600">{restaurant.terminal}</p>
                      <a 
                        href={restaurant.location.mapUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-aerox-blue hover:underline flex items-center mt-1 text-sm"
                      >
                        View on Map <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-aerox-blue mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-aerox-blue/90">Opening Hours</h4>
                      <p className="text-gray-600">{restaurant.hours.open} - {restaurant.hours.close}</p>
                      <p className="text-gray-600">{restaurant.hours.days}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-aerox-blue mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-aerox-blue/90">Phone</h4>
                      <p className="text-gray-600">{restaurant.contact.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-aerox-blue mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-aerox-blue/90">Email</h4>
                      <p className="text-gray-600">{restaurant.contact.email}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Restaurant Images */}
              <div className="premium-card rounded-lg p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-aerox-blue">Photos</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-aerox-blue hover:text-aerox-blue/90"
                    onClick={() => setShowGallery(true)}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {restaurant.images.slice(0, 4).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${restaurant.name} interior ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-90 transition"
                      onClick={() => {
                        setActiveImageIndex(index);
                        setShowGallery(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Main content */}
            <div className="lg:col-span-2">
              <div className="premium-card rounded-lg p-5 mb-6">
                <h3 className="text-xl font-semibold mb-2 text-aerox-blue">About</h3>
                <p className="text-gray-700">{restaurant.description}</p>
              </div>
              
              <Tabs defaultValue="menu" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/80 backdrop-blur-sm">
                  <TabsTrigger 
                    value="menu"
                    className="data-[state=active]:bg-aerox-blue data-[state=active]:text-white"
                  >
                    Menu
                  </TabsTrigger>
                  {restaurant.hasReservation && (
                    <TabsTrigger 
                      value="reservation"
                      className="data-[state=active]:bg-aerox-blue data-[state=active]:text-white"
                    >
                      Reservation
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="menu" className="space-y-6">
                  {/* Menu Filters */}
                  <MenuFilter 
                    items={menuItems} 
                    onFilterChange={setFilteredMenuItems} 
                  />
                  
                  {/* Menu Items - 4 column grid */}
                  {filteredMenuItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredMenuItems.map(item => (
                        <MenuItem key={item.id} item={item} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 premium-card rounded-lg">
                      <h3 className="text-lg font-medium text-aerox-blue mb-2">
                        No menu items found
                      </h3>
                      <p className="text-gray-500">
                        Try adjusting your filters to see more results
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                {restaurant.hasReservation && (
                  <TabsContent value="reservation">
                    <TableReservation restaurant={restaurant} tables={tables} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </div>
        
        {/* Image Gallery Modal */}
        {showGallery && (
          <div className="fixed inset-0 z-50 bg-aerox-blue/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
              <img
                src={restaurant.images[activeImageIndex]}
                alt={`${restaurant.name} gallery image`}
                className="w-full max-h-[70vh] object-contain mb-4"
              />
              
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {restaurant.images.map((image, index) => (
                    <button
                      key={index}
                      className={`w-12 h-12 rounded-md overflow-hidden ${
                        index === activeImageIndex 
                          ? "ring-2 ring-white" 
                          : "opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => setActiveImageIndex(index)}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                  onClick={() => setShowGallery(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default RestaurantDetail;