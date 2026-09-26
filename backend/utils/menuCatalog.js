/**
 * Authoritative Server-Side Menu Catalog & Order Pricing Engine
 * 
 * Implements authoritative pricing under OWASP A04 (Insecure Design) and CWE-472.
 * Strictly calculates order totals and item prices on the server, eliminating any
 * reliance on client-supplied financial parameters or prices.
 */

const { getRestaurantIdByName, getRestaurantNameById } = require('./restaurantMapping');

// Canonical menu catalog keyed by Restaurant ID ("1" to "6")
const MENU_CATALOG_BY_RESTAURANT_ID = Object.freeze({
  // 1: Barista (Café)
  "1": Object.freeze([
    { name: "Cappuccino", price: 4.95, category: "Coffee" },
    { name: "Espresso", price: 3.50, category: "Coffee" },
    { name: "Latte", price: 4.75, category: "Coffee" },
    { name: "Mocha", price: 5.25, category: "Coffee" },
    { name: "Croissant", price: 3.25, category: "Pastry" },
    { name: "Blueberry Muffin", price: 3.50, category: "Pastry" },
    { name: "Chocolate Chip Cookie", price: 2.75, category: "Pastry" },
    { name: "Fruit & Yogurt Parfait", price: 5.95, category: "Breakfast" },
    { name: "Seasonal Iced Tea", price: 4.50, category: "Beverages" },
    { name: "Signature Breakfast Sandwich", price: 6.95, category: "Breakfast" },
    { name: "waffle cake", price: 7.95, category: "Breakfast" },
    { name: "Smoked Salmon Bagel", price: 5.50, category: "Breakfast" }
  ]),

  // 2: Pizza Hut (Fast Food)
  "2": Object.freeze([
    { name: "Classic Cheeseburger", price: 8.95, category: "Burgers" },
    { name: "Double Bacon Burger", price: 11.95, category: "Burgers" },
    { name: "Veggie Burger", price: 9.95, category: "Burgers" },
    { name: "French Fries", price: 3.95, category: "Sides" },
    { name: "Chicken Nuggets (6pc)", price: 5.95, category: "Chicken" },
    { name: "Chicken Sandwich", price: 8.95, category: "Chicken" },
    { name: "Classic Pizza Slice", price: 4.95, category: "Pizza" },
    { name: "Pepperoni Pizza Slice", price: 5.25, category: "Pizza" },
    { name: "Chocolate Milkshake", price: 4.95, category: "Beverages" },
    { name: "Seasonal Salad", price: 7.95, category: "Salads" },
    { name: "Chicken Salad", price: 6.95, category: "Salads" },
    { name: "Lemon mojito", price: 5.95, category: "Salads" }
  ]),

  // 3: Burger King (Fast Food)
  "3": Object.freeze([
    { name: "Classic Cheeseburger", price: 8.95, category: "Burgers" },
    { name: "Double Bacon Burger", price: 11.95, category: "Burgers" },
    { name: "Veggie Burger", price: 9.95, category: "Burgers" },
    { name: "French Fries", price: 3.95, category: "Sides" },
    { name: "Chicken Nuggets (6pc)", price: 5.95, category: "Chicken" },
    { name: "Chicken Sandwich", price: 8.95, category: "Chicken" },
    { name: "Classic Pizza Slice", price: 4.95, category: "Pizza" },
    { name: "Pepperoni Pizza Slice", price: 5.25, category: "Pizza" },
    { name: "Chocolate Milkshake", price: 4.95, category: "Beverages" },
    { name: "Seasonal Salad", price: 7.95, category: "Salads" },
    { name: "Chicken Salad", price: 6.95, category: "Salads" },
    { name: "Lemon mojito", price: 5.95, category: "Salads" }
  ]),

  // 4: Coffee Bean (Café)
  "4": Object.freeze([
    { name: "Cappuccino", price: 4.95, category: "Coffee" },
    { name: "Espresso", price: 3.50, category: "Coffee" },
    { name: "Latte", price: 4.75, category: "Coffee" },
    { name: "Mocha", price: 5.25, category: "Coffee" },
    { name: "Croissant", price: 3.25, category: "Pastry" },
    { name: "Blueberry Muffin", price: 3.50, category: "Pastry" },
    { name: "Chocolate Chip Cookie", price: 2.75, category: "Pastry" },
    { name: "Fruit & Yogurt Parfait", price: 5.95, category: "Breakfast" },
    { name: "Seasonal Iced Tea", price: 4.50, category: "Beverages" },
    { name: "Signature Breakfast Sandwich", price: 6.95, category: "Breakfast" },
    { name: "waffle cake", price: 7.95, category: "Breakfast" },
    { name: "Smoked Salmon Bagel", price: 5.50, category: "Breakfast" }
  ]),

  // 5: Ex Tea (Beverages)
  "5": Object.freeze([
    { name: "Green Tea", price: 3.95, category: "Tea" },
    { name: "Earl Grey Tea", price: 3.95, category: "Tea" },
    { name: "Jasmine Tea", price: 4.25, category: "Tea" },
    { name: "Bubble Milk Tea", price: 5.95, category: "Tea" },
    { name: "Mango Fruit Tea", price: 5.50, category: "Tea" },
    { name: "Berry Blast Smoothie", price: 6.50, category: "Smoothies" },
    { name: "Matcha Latte", price: 5.25, category: "Specialty" },
    { name: "Seasonal Fruit Infusion", price: 5.95, category: "Specialty" }
  ]),

  // 6: Palm Strip Bar & Restaurant (Fine Dining)
  "6": Object.freeze([
    { name: "Seared Salmon", price: 24.95, category: "Mains" },
    { name: "Filet Mignon", price: 32.95, category: "Mains" },
    { name: "Truffle Risotto", price: 19.95, category: "Mains" },
    { name: "Lobster Pasta", price: 28.95, category: "Mains" },
    { name: "Seasonal Vegetable Plate", price: 16.95, category: "Mains" },
    { name: "Signature Cocktail", price: 14.95, category: "Drinks" },
    { name: "Glass of House Wine", price: 9.95, category: "Drinks" },
    { name: "Cheese Board", price: 16.95, category: "Appetizers" },
    { name: "Seared Scallops", price: 18.95, category: "Appetizers" },
    { name: "Crème Brûlée", price: 9.95, category: "Desserts" },
    { name: "Creamy Chicken Diane", price: 16.95, category: "Mains" },
    { name: "Steak with Garlic Cream Sauce", price: 19.95, category: "Mains" }
  ])
});

/**
 * Retrieves the menu catalog for a given restaurant identifier.
 * @param {string} restaurantIdentifier - Restaurant name or ID
 * @returns {Array|null} Array of menu items or null if unmapped
 */
function getAuthoritativeMenu(restaurantIdentifier) {
  if (!restaurantIdentifier) return null;
  let restaurantId = getRestaurantIdByName(restaurantIdentifier);
  if (!restaurantId && MENU_CATALOG_BY_RESTAURANT_ID[String(restaurantIdentifier)]) {
    restaurantId = String(restaurantIdentifier);
  }
  if (!restaurantId || !MENU_CATALOG_BY_RESTAURANT_ID[restaurantId]) {
    return null;
  }
  return MENU_CATALOG_BY_RESTAURANT_ID[restaurantId];
}

/**
 * Validates order items, enforces positive integer quantities, verifies item ownership against
 * the restaurant's authoritative menu catalog, and computes totalAmount on the server.
 *
 * Any client-supplied 'price' or 'totalAmount' is discarded.
 *
 * @param {string} restaurantName - The target restaurant name
 * @param {Array} itemsPurchased - Array of raw items from client { name, quantity, ... }
 * @returns {{ sanitizedItems: Array, totalAmount: number, canonicalRestaurantName: string }}
 * @throws {Error} Descriptive error on validation failure
 */
function validateAndPriceOrderItems(restaurantName, itemsPurchased) {
  if (!restaurantName || typeof restaurantName !== 'string' || !restaurantName.trim()) {
    const err = new Error('Restaurant name is required');
    err.status = 400;
    throw err;
  }

  const restaurantId = getRestaurantIdByName(restaurantName);
  if (!restaurantId) {
    const err = new Error(`Unknown restaurant: "${restaurantName}"`);
    err.status = 400;
    throw err;
  }

  const canonicalRestaurantName = getRestaurantNameById(restaurantId);
  const catalog = MENU_CATALOG_BY_RESTAURANT_ID[restaurantId];
  if (!catalog || !Array.isArray(catalog) || catalog.length === 0) {
    const err = new Error(`No menu catalog configured for restaurant "${canonicalRestaurantName}"`);
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(itemsPurchased) || itemsPurchased.length === 0) {
    const err = new Error('Order must contain at least one item');
    err.status = 400;
    throw err;
  }

  const sanitizedItems = [];
  let calculatedTotal = 0;

  for (let i = 0; i < itemsPurchased.length; i++) {
    const rawItem = itemsPurchased[i];
    if (!rawItem || typeof rawItem !== 'object') {
      const err = new Error(`Item at index ${i} is invalid`);
      err.status = 400;
      throw err;
    }

    const itemName = typeof rawItem.name === 'string' ? rawItem.name.trim() : '';
    if (!itemName) {
      const err = new Error(`Item at index ${i} is missing a valid name`);
      err.status = 400;
      throw err;
    }

    // Lookup item in authoritative catalog (case-insensitive)
    const catalogItem = catalog.find(
      ci => ci.name.toLowerCase() === itemName.toLowerCase()
    );

    if (!catalogItem) {
      const err = new Error(`Item "${itemName}" is not offered by restaurant "${canonicalRestaurantName}"`);
      err.status = 400;
      throw err;
    }

    // Strict quantity validation: must be positive whole integer between 1 and 50
    const rawQty = rawItem.quantity;
    const qtyNumber = Number(rawQty);

    if (
      typeof rawQty === 'undefined' ||
      rawQty === null ||
      !Number.isInteger(qtyNumber) ||
      qtyNumber < 1 ||
      qtyNumber > 50
    ) {
      const err = new Error(`Invalid quantity for item "${catalogItem.name}". Quantity must be an integer between 1 and 50.`);
      err.status = 400;
      throw err;
    }

    // Server-authoritative price lookup (client price is completely discarded)
    const authoritativePrice = catalogItem.price;
    const lineTotal = authoritativePrice * qtyNumber;
    calculatedTotal += lineTotal;

    sanitizedItems.push({
      name: catalogItem.name,
      quantity: qtyNumber,
      price: authoritativePrice
    });
  }

  // Ensure high precision rounding to 2 decimal places
  const totalAmount = parseFloat(calculatedTotal.toFixed(2));

  return {
    sanitizedItems,
    totalAmount,
    canonicalRestaurantName
  };
}

module.exports = {
  MENU_CATALOG_BY_RESTAURANT_ID,
  getAuthoritativeMenu,
  validateAndPriceOrderItems
};
