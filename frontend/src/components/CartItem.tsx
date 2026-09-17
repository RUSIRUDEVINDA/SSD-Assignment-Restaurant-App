import React from "react";
import { X } from "lucide-react";
import { FiMinus, FiPlus } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { CartItem as CartItemType } from "@/types";

interface CartItemProps {
  item: CartItemType;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, updateQuantity, removeItem }) => {
  const { menuItem, quantity } = item;

  const handleDecrease = () => {
    if (quantity > 1) {
      updateQuantity(menuItem.id, quantity - 1);
    } else {
      removeItem(menuItem.id);
    }
  };

  const handleIncrease = () => {
    updateQuantity(menuItem.id, quantity + 1);
  };

  return (
    <div className="flex items-center py-4 border-b">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
        <img
          src={menuItem.image}
          alt={menuItem.name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="ml-4 flex-1">
        <div className="flex justify-between">
          <h3 className="text-base font-medium text-gray-900">{menuItem.name}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-aerox-red"
            onClick={() => removeItem(menuItem.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-sm text-gray-500 line-clamp-1">{menuItem.description}</p>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-medium text-aerox-blue">
            ${(menuItem.price * quantity).toFixed(2)}
          </span>
          
          <div className="flex items-center border rounded-lg bg-white">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-3 py-0 text-gray-600 hover:text-aerox-blue hover:bg-gray-100 transition-colors"
              onClick={handleDecrease}
            >
              <FiMinus className="h-6 w-6" />
            </Button>
            
            <span className="mx-2 text-sm font-medium text-gray-900">{quantity}</span>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-3 py-0 text-gray-600 hover:text-aerox-blue hover:bg-gray-100 transition-colors"
              onClick={handleIncrease}
            >
              <FiPlus className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
