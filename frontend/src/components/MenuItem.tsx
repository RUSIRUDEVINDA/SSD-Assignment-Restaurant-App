import React from "react";
import { Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MenuItem as MenuItemType } from "@/types";
import { useCart } from "@/contexts/CartContext";

interface MenuItemProps {
  item: MenuItemType;
}

const MenuItem: React.FC<MenuItemProps> = ({ item }) => {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem(item, 1);
  };

  return (
    <div className="menu-item bg-white rounded-xl shadow-md overflow-hidden flex flex-col transform hover:scale-105 w-[220px] border border-gray-100 transition-all">
      <div className="relative h-40">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover rounded-t-xl"
        />
        
        {/* Special or Seasonal badges */}
        <div className="absolute top-2 left-2 flex flex-col space-y-1">
          {item.isSpecial && (
            <Badge className="bg-aerox-gold text-black flex items-center">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Special
            </Badge>
          )}
          {item.isSeasonal && (
            <Badge className="bg-aerox-teal text-white">Seasonal</Badge>
          )}
        </div>
      </div>
      
      <div className="p-3 flex-grow flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-medium text-sm w-full">{item.name}</h3>
          <span className="font-semibold text-aerox-blue whitespace-nowrap">${item.price.toFixed(2)}</span>
        </div>
        
        <Badge variant="outline" className="mt-2 mb-2">
          {item.category}
        </Badge>
        
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{item.description}</p>
      </div>
      
      <div className="px-3 pb-3 flex justify-center">
        <Button 
          onClick={handleAddToCart}
          className="w-full bg-aerox-blue hover:bg-aerox-blue/90 text-xs transition-colors"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

const MenuGrid: React.FC<{ items: MenuItemType[] }> = ({ items }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <MenuItem key={item.id} item={item} />
      ))}
    </div>
  );
};

export { MenuItem, MenuGrid };