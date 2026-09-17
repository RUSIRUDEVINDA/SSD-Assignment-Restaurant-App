
import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "sonner";
import { Cart, CartItem, MenuItem } from "../types";

interface CartContextType {
  cart: Cart;
  addItem: (menuItem: MenuItem, quantity?: number) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  setPickupTime: (time: string) => void;
  totalItems: number;
  totalPrice: number;
}

const defaultCart: Cart = {
  items: [],
  restaurantId: null,
  pickupTime: null,
};

const CartContext = createContext<CartContextType>({
  cart: defaultCart,
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  setPickupTime: () => {},
  totalItems: 0,
  totalPrice: 0,
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart>(() => {
    // Initialize cart from localStorage if available
    const savedCart = localStorage.getItem("aeroxCart");
    return savedCart ? JSON.parse(savedCart) : defaultCart;
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("aeroxCart", JSON.stringify(cart));
  }, [cart]);

  const addItem = (menuItem: MenuItem, quantity = 1) => {
    setCart(prevCart => {
      // Check if adding from a different restaurant
      if (prevCart.restaurantId && prevCart.restaurantId !== menuItem.restaurantId && prevCart.items.length > 0) {
        const confirmed = window.confirm(
          "Adding items from a different restaurant will clear your current cart. Continue?"
        );
        
        if (!confirmed) {
          return prevCart;
        }
        
        // Clear cart and add new item
        toast.info("Cart cleared. Added item from new restaurant.");
        return {
          items: [{ menuItem, quantity }],
          restaurantId: menuItem.restaurantId,
          pickupTime: null,
        };
      }
      
      // Check if item already exists in cart
      const existingItem = prevCart.items.find(item => item.menuItem.id === menuItem.id);
      
      if (existingItem) {
        // Update quantity of existing item
        return {
          ...prevCart,
          items: prevCart.items.map(item =>
            item.menuItem.id === menuItem.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        };
      }
      
      // Add new item to cart
      toast.success(`Added ${menuItem.name} to cart`);
      return {
        ...prevCart,
        items: [...prevCart.items, { menuItem, quantity }],
        restaurantId: prevCart.restaurantId || menuItem.restaurantId,
      };
    });
  };

  const removeItem = (menuItemId: string) => {
    setCart(prevCart => {
      const newItems = prevCart.items.filter(item => item.menuItem.id !== menuItemId);
      
      // If cart is now empty, reset restaurantId
      const newRestaurantId = newItems.length > 0 ? prevCart.restaurantId : null;
      
      toast.info("Item removed from cart");
      return {
        ...prevCart,
        items: newItems,
        restaurantId: newRestaurantId,
      };
    });
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map(item =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      ),
    }));
  };

  const clearCart = () => {
    setCart(defaultCart);
    toast.info("Cart cleared");
  };

  const setPickupTime = (time: string) => {
    setCart(prevCart => ({
      ...prevCart,
      pickupTime: time,
    }));
  };

  // Calculate total items and price
  const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
  
  const totalPrice = cart.items.reduce(
    (total, item) => total + item.menuItem.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setPickupTime,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
