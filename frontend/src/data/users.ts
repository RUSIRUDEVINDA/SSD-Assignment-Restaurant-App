
import { User } from "../types";

// Mock user data
export const users: User[] = [
  // Customer
  {
    id: "customer1",
    name: "Ovindi Vimasha",
    email: "ovindivimasha1015@gmail.com",
    phone: "0752076063",
    type: "customer"
  },
  // Restaurant Admins
  {
    id: "barista_admin",
    name: "Barista Admin",
    email: "barista@admin.com",
    phone: "555-234-5678",
    type: "admin",
    restaurantId: "1"
  },
  {
    id: "pizzahut_admin",
    name: "Pizza Hut Admin",
    email: "pizzahut@admin.com",
    phone: "555-345-6789",
    type: "admin",
    restaurantId: "2"
  },
  {
    id: "bk_admin",
    name: "Burger King Admin",
    email: "bk@admin.com",
    phone: "555-456-7890",
    type: "admin",
    restaurantId: "3"
  },
  {
    id: "coffeebean_admin",
    name: "Coffee Bean Admin",
    email: "coffeebean@admin.com",
    phone: "555-567-8901",
    type: "admin",
    restaurantId: "4"
  },
  {
    id: "extea_admin",
    name: "Ex Tea Admin",
    email: "extea@admin.com",
    phone: "555-678-9012",
    type: "admin",
    restaurantId: "5"
  },
  {
    id: "palmstrip_admin",
    name: "Palm Strip Admin",
    email: "palmstrip@admin.com",
    phone: "555-789-0123",
    type: "admin",
    restaurantId: "6"
  },
  // Main Admin
  {
    id: "main_admin",
    name: "Main Administrator",
    email: "admin@aerox.com",
    phone: "555-890-1234",
    type: "mainAdmin"
  }
];

// Demo logins
export const demoLogins = [
  { email: "ovindivimasha1015@gmail.com", password: "Ovindi123#" },
  { email: "barista@admin.com", password: "Barista@123" },
  { email: "pizzahut@admin.com", password: "Pizzahut@123" },
  { email: "bk@admin.com", password: "Burgerking@123" },
  { email: "coffeebean@admin.com", password: "Coffeebean@123" },
  { email: "extea@admin.com", password: "Extea@123" },
  { email: "palmstrip@admin.com", password: "Palmstrip@123" },
  { email: "admin@aerox.com", password: "Admin@123" }
];

export const getUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email === email);
};

export const getUserById = (id: string): User | undefined => {
  return users.find(user => user.id === id);
};
