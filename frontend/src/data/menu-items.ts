
import { MenuItem } from "../types";

// Helper function to generate menu items
const generateMenuItems = (restaurantId: string, category: string): MenuItem[] => {
  const categories: Record<string, any[]> = {
    "Café": [
      { name: "Cappuccino", price: 4.95, category: "Coffee", isSpecial: false, isSeasonal: false, image: "/images/classic_cappuchino.jpg" },
      { name: "Espresso", price: 3.50, category: "Coffee", isSpecial: false, isSeasonal: false, image: "/images/classic_espresso.jpeg" },
      { name: "Latte", price: 4.75, category: "Coffee", isSpecial: false, isSeasonal: false, image: "/images/vanila_latte.jpg" },
      { name: "Mocha", price: 5.25, category: "Coffee", isSpecial: false, isSeasonal: false, image: "/images/dark_mocha.jpg" },
      { name: "Croissant", price: 3.25, category: "Pastry", isSpecial: false, isSeasonal: false, image: "/images/croissant.jpg" },
      { name: "Blueberry Muffin", price: 3.50, category: "Pastry", isSpecial: false, isSeasonal: false, image: "/images/blueberrymuffin.jpg" },
      { name: "Chocolate Chip Cookie", price: 2.75, category: "Pastry", isSpecial: false, isSeasonal: false, image: "/images/chocolatechipcookie.jpg" },
      { name: "Fruit & Yogurt Parfait", price: 5.95, category: "Breakfast", isSpecial: false, isSeasonal: false, image: "/images/fruit.jpg" },
      { name: "Seasonal Iced Tea", price: 4.50, category: "Beverages", isSpecial: false, isSeasonal: true, image: "/images/icetea.jpg" },
      { name: "Signature Breakfast Sandwich", price: 6.95, category: "Breakfast", isSpecial: true, isSeasonal: false, image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500" },
      { name: "waffle cake", price: 7.95, category: "Breakfast", isSpecial: false, isSeasonal: false, image: "/images/wafflecake.jpg" },
      { name: "Smoked Salmon Bagel", price: 5.50, category: "Breakfast", isSpecial: true, isSeasonal: false, image: "/images/bagel.jpg" }
    ],
    "Fast Food": [
      { name: "Classic Cheeseburger", price: 8.95, category: "Burgers", isSpecial: false, isSeasonal: false, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" },
      { name: "Double Bacon Burger", price: 11.95, category: "Burgers", isSpecial: true, isSeasonal: false, image: "/images/doublebacon.jpg" },
      { name: "Veggie Burger", price: 9.95, category: "Burgers", isSpecial: false, isSeasonal: false, image: "/images/veggieburger.jpg" },
      { name: "French Fries", price: 3.95, category: "Sides", isSpecial: false, isSeasonal: false, image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500" },
      { name: "Chicken Nuggets (6pc)", price: 5.95, category: "Chicken", isSpecial: false, isSeasonal: false, image: "https://images.unsplash.com/photo-1562967915-92ae0c320a01?w=500" },
      { name: "Chicken Sandwich", price: 8.95, category: "Chicken", isSpecial: false, isSeasonal: false, image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500" },
      { name: "Classic Pizza Slice", price: 4.95, category: "Pizza", isSpecial: false, isSeasonal: false, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500" },
      { name: "Pepperoni Pizza Slice", price: 5.25, category: "Pizza", isSpecial: false, isSeasonal: false, image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500" },
      { name: "Chocolate Milkshake", price: 4.95, category: "Beverages", isSpecial: false, isSeasonal: false, image: "/images/chocolatemilkshake.jpg" },
      { name: "Seasonal Salad", price: 7.95, category: "Salads", isSpecial: false, isSeasonal: true, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500" },
      { name: "Chicken Salad", price: 6.95, category: "Salads", isSpecial: false, isSeasonal: false, image: "/images/chickensalad.jpg" },
      { name: "Lemon mojito", price: 5.95, category: "Salads", isSpecial: true, isSeasonal: true, image: "/images/mojito.jpg" }
    ],
    "Beverages": [
      { name: "Green Tea", price: 3.95, category: "Tea", isSpecial: false, isSeasonal: false, image: "/images/greentea.jpg" },
      { name: "Earl Grey Tea", price: 3.95, category: "Tea", isSpecial: false, isSeasonal: false, image: "/images/earlgrey.jpg" },
      { name: "Jasmine Tea", price: 4.25, category: "Tea", isSpecial: false, isSeasonal: false, image: "/images/jasmine.jpg" },
      { name: "Bubble Milk Tea", price: 5.95, category: "Tea", isSpecial: true, isSeasonal: false, image: "/images/bubble.jpg" },
      { name: "Mango Fruit Tea", price: 5.50, category: "Tea", isSpecial: false, isSeasonal: false, image: "/images/mango.jpg" },
      { name: "Berry Blast Smoothie", price: 6.50, category: "Smoothies", isSpecial: false, isSeasonal: false, image: "/images/berryblast.jpg" },
      { name: "Matcha Latte", price: 5.25, category: "Specialty", isSpecial: false, isSeasonal: false, image: "/images/matcha.jpg" },
      { name: "Seasonal Fruit Infusion", price: 5.95, category: "Specialty", isSpecial: false, isSeasonal: true, image: "/images/infusion.jpg" },
    ],
    "Fine Dining": [
      { name: "Seared Salmon", price: 24.95, category: "Mains", isSpecial: false, isSeasonal: false, image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500" },
      { name: "Filet Mignon", price: 32.95, category: "Mains", isSpecial: true, isSeasonal: false, image: "https://images.unsplash.com/photo-1558030006-450675393462?w=500" },
      { name: "Truffle Risotto", price: 19.95, category: "Mains", isSpecial: false, isSeasonal: false, image: "/images/truffle.jpg" },
      { name: "Lobster Pasta", price: 28.95, category: "Mains", isSpecial: false, isSeasonal: false, image: "/images/lobster.jpg" },
      { name: "Seasonal Vegetable Plate", price: 16.95, category: "Mains", isSpecial: false, isSeasonal: true, image: "/images/vegetable.jpg" },
      { name: "Signature Cocktail", price: 14.95, category: "Drinks", isSpecial: true, isSeasonal: false, image: "/images/cocktail.jpg" },
      { name: "Glass of House Wine", price: 9.95, category: "Drinks", isSpecial: false, isSeasonal: false, image: "/images/wine.jpg" },
      { name: "Cheese Board", price: 16.95, category: "Appetizers", isSpecial: false, isSeasonal: false, image: "/images/cheese.jpg" },
      { name: "Seared Scallops", price: 18.95, category: "Appetizers", isSpecial: false, isSeasonal: false, image: "/images/scallops.jpg" },
      { name: "Crème Brûlée", price: 9.95, category: "Desserts", isSpecial: false, isSeasonal: false, image: "/images/creme.jpg" },
      { name: "Creamy Chicken Diane", price: 16.95, category: "Mains", isSpecial: false, isSeasonal: false, image: "/images/creamy chicken diane.jpg" },
      { name: "Steak with Garlic Cream Sauce", price: 19.95, category: "Mains", isSpecial: false, isSeasonal: false, image: "/images/steak with garlic cream sauce.jpg" }
    ]
  };

  // Get menu items for the specific restaurant type
  const items = categories[category] || categories["Café"];

  // Convert to the correct format with IDs and restaurantId
  return items.map((item, index) => ({
    id: `${restaurantId}-item-${index + 1}`,
    restaurantId,
    name: item.name,
    description: `Delicious ${item.name.toLowerCase()} prepared with premium ingredients.`,
    price: item.price,
    category: item.category,
    image: item.image,
    isSpecial: item.isSpecial,
    isSeasonal: item.isSeasonal
  }));
};

// Generate menu items for each restaurant
export const menuItems: MenuItem[] = [
  ...generateMenuItems("1", "Café"), // Barista
  ...generateMenuItems("2", "Fast Food"), // Pizza Hut
  ...generateMenuItems("3", "Fast Food"), // Burger King
  ...generateMenuItems("4", "Café"), // Coffee Bean
  ...generateMenuItems("5", "Beverages"), // Ex Tea
  ...generateMenuItems("6", "Fine Dining") // Palm Strip Bar & Restaurant
];

export const getMenuItemsByRestaurant = (restaurantId: string): MenuItem[] => {
  return menuItems.filter(item => item.restaurantId === restaurantId);
};
