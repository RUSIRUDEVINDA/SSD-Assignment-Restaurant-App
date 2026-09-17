import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Clock, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Restaurant } from "@/types";
import axios from "axios";

interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, className = "" }) => {
  const navigate = useNavigate();

  const handleCardClick = async (e: React.MouseEvent) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/restaurant/view`,
        { restaurantId: restaurant.id, restaurantName: restaurant.name },
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Error storing restaurant data:", error);
    }
  };

  return (
    <Link
      to={`/restaurant/${restaurant.id}`}
      onClick={handleCardClick}
      className="block transform transition-all duration-300 hover:scale-[1.02]"
    >
      <div className={`restaurant-card bg-white/80 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 backdrop-blur-sm ${className}`}>
        
        {/* Restaurant Image */}
        <div className="relative h-52 overflow-hidden">
          <img
            src={restaurant.images[2]}
            alt={restaurant.name}
            className="w-full h-full object-cover transform transition-transform duration-300 hover:scale-105"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-aerox-blue/80 to-transparent p-4">
            <h3 className="text-white font-semibold text-xl">{restaurant.name}</h3>
          </div>

          {/* Category Badge */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-gradient-to-br from-aerox-blue to-aerox-blue/80 text-white shadow-md">
              {restaurant.category}
            </Badge>
          </div>

          {/* Reservation Badge */}
          {restaurant.hasReservation && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-white text-aerox-blue shadow-md">
                Reservation Available
              </Badge>
            </div>
          )}
        </div>

        {/* Restaurant Info */}
        <div className="p-5 space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin size={18} className="mr-2 text-aerox-blue" />
            <span>
              <strong>Terminal {restaurant.terminal.split(" ")[1]}</strong>, Shop {restaurant.location.shopNumber}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Clock size={18} className="mr-2 text-aerox-blue" />
            <span>
              <strong>{restaurant.hours.open} - {restaurant.hours.close}</strong>, {restaurant.hours.days}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Phone size={18} className="mr-2 text-aerox-blue" />
            <span>{restaurant.contact.phone}</span>
          </div>

          {/* Restaurant Description */}
          <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed mt-2">
            {restaurant.description}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;
