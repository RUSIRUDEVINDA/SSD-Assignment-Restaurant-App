export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface RestaurantOrder {
  _id: string;
  restaurantName: string;
  itemsPurchased: OrderItem[];
  totalAmount: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  pickupTime: string;
  status?: string;
  createdAt?: string;
  modifiedAt?: string | null;
}
