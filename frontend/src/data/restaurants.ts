
import { Restaurant } from "../types";

export const restaurants: Restaurant[] = [
  {
    id: "1",
    name: "Barista",
    category: "Café",
    terminal: "Terminal 1",
    description: "Premium coffee shop offering a variety of specialty coffees, teas, and light snacks. Perfect for a quick energizing break before your flight.",
    location: {
      shopNumber: "T1-A12",
      mapUrl: "https://goo.gl/maps/WNPbHYsyHxLdQiiW9"
    },
    contact: {
      phone: "+1-555-123-4567",
      email: "barista.t1@aerox.com"
    },
    hours: {
      open: "05:00",
      close: "22:00",
      days: "Daily"
    },
    images: [
      "/images/Barista1.jpg",
      "/images/Barista2.jpg",
      "/images/Barista3.webp"
    ],
    hasReservation: true,
    adminId: "barista_admin",
    logo: undefined
  },
  {
    id: "2",
    name: "Pizza Hut",
    category: "Fast Food",
    terminal: "Terminal 2",
    description: "Enjoy your favorite pizzas and Italian-inspired dishes at our conveniently located airport restaurant. Perfect for families and groups.",
    location: {
      shopNumber: "T2-B24",
      mapUrl: "https://goo.gl/maps/WNPbHYsyHxLdQiiW9"
    },
    contact: {
      phone: "+1-555-234-5678",
      email: "pizzahut.t2@aerox.com"
    },
    hours: {
      open: "06:00",
      close: "23:00",
      days: "Daily"
    },
    images: [
      "/images/pizzahut1.webp",
      "/images/pizzahut2.jpg",
      "/images/pizzahut3.jpg",
    ],
    hasReservation: true,
    adminId: "pizzahut_admin",
    logo: undefined
  },
  {
    id: "3",
    name: "Burger King",
    category: "Fast Food",
    terminal: "Terminal 1",
    description: "Flame-grilled burgers and more at our airport location. Quick service for travelers on the go.",
    location: {
      shopNumber: "T1-C15",
      mapUrl: "https://goo.gl/maps/WNPbHYsyHxLdQiiW9"
    },
    contact: {
      phone: "+1-555-345-6789",
      email: "bk.t1@aerox.com"
    },
    hours: {
      open: "06:00",
      close: "23:30",
      days: "Daily"
    },
    images: [
      "/images/burgerking2.jpg",
      "/images/burgerking3.webp",
      "/images/burgerking.webp",
    ],
    hasReservation: false,
    adminId: "bk_admin",
    logo: undefined
  },
  {
    id: "4",
    name: "Coffee Bean",
    category: "Café",
    terminal: "Terminal 3",
    description: "Specialty coffee shop known for its unique blends and relaxing atmosphere. A perfect spot to unwind before your journey.",
    location: {
      shopNumber: "T3-D10",
      mapUrl: "https://goo.gl/maps/WNPbHYsyHxLdQiiW9"
    },
    contact: {
      phone: "+1-555-456-7890",
      email: "coffeebean.t3@aerox.com"
    },
    hours: {
      open: "05:30",
      close: "22:30",
      days: "Daily"
    },
    images: [
      "/images/coffeebean3.jpg",
      "/images/coffeebean2.jpg",
      "/images/coffeebean.jpeg",
    ],
    hasReservation: true,
    adminId: "coffeebean_admin",
    logo: undefined
  },
  {
    id: "5",
    name: "Ex Tea",
    category: "Beverages",
    terminal: "Terminal 2",
    description: "Experience exotic tea varieties from around the world. Our tea masters craft the perfect cup for every preference.",
    location: {
      shopNumber: "T2-E08",
      mapUrl: "https://goo.gl/maps/WNPbHYsyHxLdQiiW9"
    },
    contact: {
      phone: "+1-555-567-8901",
      email: "extea.t2@aerox.com"
    },
    hours: {
      open: "07:00",
      close: "21:00",
      days: "Daily"
    },
    images: [
      "/images/extea2.webp",
      "/images/extea3.webp",
      "/images/extea.jpg",
    ],
    hasReservation: false,
    adminId: "extea_admin",
    logo: undefined
  },
  {
    id: "6",
    name: "Palm Strip Bar & Restaurant",
    category: "Fine Dining",
    terminal: "Terminal 3",
    description: "Upscale dining experience with a view of the runways. Enjoy gourmet meals and premium cocktails before your flight.",
    location: {
      shopNumber: "T3-F22",
      mapUrl: "https://goo.gl/maps/WNPbHYsyHxLdQiiW9"
    },
    contact: {
      phone: "+1-555-678-9012",
      email: "palmstrip.t3@aerox.com"
    },
    hours: {
      open: "10:00",
      close: "00:00",
      days: "Daily"
    },
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
      "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    ],
    hasReservation: false,
    adminId: "palmstrip_admin",
    logo: undefined
  }
];
