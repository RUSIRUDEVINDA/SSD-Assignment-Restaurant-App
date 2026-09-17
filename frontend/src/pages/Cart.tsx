import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner"; 
import { 
  ShoppingBag, 
  ChevronLeft, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Calendar, 
  CheckCircle2,
  Building, 
  DollarSign, 
  CreditCard as CardIcon, 
  CalendarClock, 
  ShieldCheck, 
  ShoppingCart,
  Receipt
} from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartItem from "@/components/CartItem"; 
import { restaurants } from "@/data/restaurants";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod"; 
import axios from 'axios';  

interface OrderResponse {
  _id: string;
  // Add other properties you expect in the response if needed
}

// Utility to format Sri Lankan phone numbers to E.164
function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  let cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith('94')) {
    cleaned = `94${cleaned}`;
  }
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }
  return cleaned;
}

const checkoutFormSchema = z.object({
  name: z.string().min(2, "Name is required").regex(/^[a-zA-Z\s]+$/, "Only letters are allowed"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string()
    .min(9, "Phone number is too short")
    .max(12, "Phone number is too long")
    .regex(/^(\+94)?[1-9]\d{8}$/, "Phone number must be in Sri Lankan format (e.g. +94771234567 or 771234567)"),
  pickupTime: z.string().min(1, "Pickup time is required"),
  paymentMethod: z.literal("card"),
  cardName: z.string().min(2, "Cardholder name is required").regex(/^[a-zA-Z\s]+$/, "Only letters are allowed"),
  cardNumber: z.string()
    .refine(val => val.replace(/\s/g, '').length === 16 && /^\d{16}$/.test(val.replace(/\s/g, '')), "Card number must be 16 digits"),
  cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/(\d{2})$/, "Expiry date format should be MM/YY")
    .refine((val) => {
      const [month, year] = val.split('/');
      const expiry = new Date();
      expiry.setFullYear(2000 + parseInt(year), parseInt(month) - 1, 1);
      return expiry > new Date();
    }, "Expiry date cannot be in the past"),
  cardCvc: z.string().regex(/^[1-9][0-9]{2,3}$/, "CVC must be 3 or 4 digits, cannot start with 0"),
  items: z.array(z.object({
    name: z.string(),
    price: z.number(),
    quantity: z.number()
  })),
  totalAmount: z.number().min(0, "Total amount must be positive")
});

type CheckoutFormType = z.infer<typeof checkoutFormSchema>;

const Cart = () => {
  const { cart, clearCart, totalItems, totalPrice, updateQuantity, removeItem } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pickupTime, setPickupTime] = useState<string>("");

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CheckoutFormType>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      pickupTime: "",
      paymentMethod: "card",
      cardName: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvc: "",
      items: cart.items.map(item => ({
        name: item.menuItem.name,
        price: item.menuItem.price,
        quantity: item.quantity
      })) || [],
      totalAmount: totalPrice || 0
    }
  });

  useEffect(() => {
    if (cart.restaurantId) {
      const restaurantInfo = restaurants.find(r => r.id === cart.restaurantId);
      setRestaurant(restaurantInfo);
    }
  }, [cart.restaurantId]);

  useEffect(() => {
    if (user) {
      setValue("name", user.name || "");
      setValue("email", user.email || "");
      setValue("phone", user.phone || "");
    }
  }, [user, setValue]);

  useEffect(() => {
    if (user?.phone) {
      setValue('phone', formatPhoneNumber(user.phone), { shouldValidate: true });
    }
  }, [user?.phone, setValue]);

  const getTimeSlots = () => {
    if (!restaurant) return [];

    const [openHour, openMinute] = restaurant.hours.open.split(':').map(Number);
    const [closeHour, closeMinute] = restaurant.hours.close.split(':').map(Number);

    let currentTime = new Date();
    
    if (currentTime.getHours() < openHour || 
        (currentTime.getHours() === openHour && currentTime.getMinutes() < openMinute)) {
      currentTime.setHours(openHour, openMinute, 0, 0);
    } else {
      const currentMinutes = currentTime.getMinutes();
      const nextInterval = Math.ceil(currentMinutes / 30) * 30;
      currentTime.setMinutes(nextInterval, 0, 0);
      
      if (currentTime.getHours() > closeHour || 
          (currentTime.getHours() === closeHour && currentTime.getMinutes() >= closeMinute)) {
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(openHour, openMinute, 0, 0);
      }
    }

    const slots = [];
    
    const endTime = new Date(currentTime);
    if (closeHour === 0 && closeMinute === 0) {
      endTime.setDate(endTime.getDate() + 1);
    }
    endTime.setHours(closeHour, closeMinute, 0, 0);

    while (currentTime < endTime) {
      const timeString = currentTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
      slots.push(timeString);

      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }

    return slots;
  };

  const onSubmit = async (data: CheckoutFormType) => {
    try {
      setIsSubmitting(true);
      
      const orderItems = cart.items.map(item => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.menuItem.price
      }));

      const response = await axios.post<OrderResponse>('http://localhost:5000/restaurant/orders', {
        restaurantName: restaurant.name,
        itemsPurchased: orderItems,
        totalAmount: parseFloat(totalPrice.toFixed(2)),
        fullName: data.name,
        email: data.email,
        phoneNumber: data.phone,
        pickupTime: data.pickupTime,
        cardNumber: data.cardNumber.replace(/\s/g, ''),
        cardExpiry: data.cardExpiry
      });

      const orderId = response.data._id;
      
      // Clear the cart after successful order
      clearCart();
      
      // Navigate to OrderSummary with order ID
      navigate('/order-summary', { state: { orderId } });
      setIsSuccess(true);
      setPickupTime(data.pickupTime);
      
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('phone', formatted, { shouldValidate: true });
  };

  // Card number input mask: xxxx xxxx xxxx xxxx
  const formatCardNumber = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(.{4})/g, '$1 ')
      .trim()
      .slice(0, 19); // 16 digits + 3 spaces
  };

  // Expiry date input mask: xx/xx
  const formatExpiry = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d{0,2})/, (match, p1, p2) => p2 ? `${p1}/${p2}` : p1)
      .slice(0, 5);
  };

  // Handler for card number field
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cardNumber', formatCardNumber(e.target.value), { shouldValidate: true });
  };

  // Handler for expiry date field
  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cardExpiry', formatExpiry(e.target.value), { shouldValidate: true });
  };

  if (cart.items.length === 0 && !isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-aerox-blue/10 to-white">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-aerox-blue/10">
              <div className="p-8 border-b border-aerox-blue/20">
                <h1 className="text-3xl font-bold text-aerox-blue mb-4 flex items-center">
                  <ShoppingCart className="mr-3 h-8 w-8 text-aerox-blue/80" />
                  Shopping Cart
                </h1>
                
                <div className="text-center py-12">
                  <div className="animate-bounce">
                    <ShoppingBag className="mx-auto h-20 w-20 text-aerox-blue/40" />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold text-aerox-blue">Your cart is empty</h2>
                  <p className="text-aerox-blue/70 mt-2 max-w-md mx-auto">Add some delicious items to your cart to continue with your order.</p>
                  <div className="mt-8">
                    <Button 
                      onClick={() => navigate("/")} 
                      className="bg-aerox-blue hover:bg-aerox-blue/90 text-white px-8 py-3 rounded-full transition-all duration-300 flex items-center"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-aerox-blue/10 to-white">
        <Header />
        
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-aerox-blue/10">
                <div className="text-center">
                  <div className="mb-8">
                    <div className="mx-auto h-20 w-20 rounded-full bg-aerox-blue/10 flex items-center justify-center">
                      <CheckCircle2 className="h-12 w-12 text-aerox-blue" />
                    </div>
                    <h1 className="mt-4 text-3xl font-bold text-aerox-blue">
                      Order Confirmed!
                    </h1>
                    <p className="mt-2 text-base text-gray-600">
                      Your order has been successfully placed. We'll notify you when it's ready for pickup.
                    </p>
                  </div>
                  
                  <div className="mt-8">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-aerox-blue/10">
                      <div className="p-6">
                        <h2 className="text-lg font-medium text-aerox-blue mb-4 flex items-center">
                          <Receipt className="mr-2 h-5 w-5 text-aerox-blue/70" />
                          Order Details
                        </h2>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-aerox-blue/10">
                            <span className="text-sm text-gray-600 flex items-center">
                              <Building className="mr-2 h-4 w-4 text-aerox-blue/70" />
                              Restaurant
                            </span>
                            <span className="text-sm font-medium text-aerox-blue">{restaurant?.name}</span>
                          </div>
                          <div className="flex items-center justify-between pb-2 border-b border-aerox-blue/10">
                            <span className="text-sm text-gray-600 flex items-center">
                              <DollarSign className="mr-2 h-4 w-4 text-aerox-blue/70" />
                              Total Amount
                            </span>
                            <span className="text-sm font-medium text-aerox-blue">${totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 flex items-center">
                              <Clock className="mr-2 h-4 w-4 text-aerox-blue/70" />
                              Pickup Time
                            </span>
                            <span className="text-sm font-medium text-aerox-blue">{pickupTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button
                      onClick={() => navigate('/restaurants')}
                      className="w-full bg-aerox-blue hover:bg-aerox-blue/90 text-white px-4 py-2 rounded-full transition-all duration-300 flex items-center justify-center"
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-aerox-blue/10 to-white">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-aerox-blue/10">
            <div className="p-8 border-b border-aerox-blue/20">
              <h1 className="text-3xl font-bold text-aerox-blue mb-4 flex items-center">
                <ShoppingCart className="mr-3 h-8 w-8 text-aerox-blue/80" />
                Shopping Cart
              </h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <CartItem
                      key={item.menuItem.id}
                      item={item}
                      updateQuantity={updateQuantity}
                      removeItem={removeItem}
                    />
                  ))}
                </div>

                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border border-aerox-blue/10 shadow-sm">
                  <h2 className="text-2xl font-bold text-aerox-blue mb-6 flex items-center">
                    <Receipt className="mr-2 h-6 w-6 text-aerox-blue/70" />
                    Order Details
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="border-t border-aerox-blue/10 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium text-gray-700 flex items-center">
                          <DollarSign className="mr-2 h-5 w-5 text-aerox-blue/70" />
                          Total
                        </span>
                        <span className="text-base font-bold text-aerox-blue">${totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {isAuthenticated ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
                      <div className="space-y-4">
                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-aerox-blue/10">
                          <h3 className="text-lg font-semibold text-aerox-blue mb-4 flex items-center">
                            <User className="mr-2 h-5 w-5 text-aerox-blue/70" />
                            Customer Information
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="name" className="flex items-center text-gray-700">
                                <User className="mr-2 h-4 w-4 text-aerox-blue/70" />
                                Full Name
                              </Label>
                              <Input
                                id="name"
                                {...register("name")}
                                className="mt-1 border-aerox-blue/20 focus:border-aerox-blue focus:ring-aerox-blue/30"
                              />
                              {errors.name && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.name.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="email" className="flex items-center text-gray-700">
                                <Mail className="mr-2 h-4 w-4 text-aerox-blue/70" />
                                Email
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                {...register("email")}
                                className="mt-1 border-aerox-blue/20 focus:border-aerox-blue focus:ring-aerox-blue/30"
                              />
                              {errors.email && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.email.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="phone" className="flex items-center text-gray-700">
                                <Phone className="mr-2 h-4 w-4 text-aerox-blue/70" />
                                Phone Number
                              </Label>
                              <Input
                                id="phone"
                                type="tel"
                                {...register("phone")}
                                onBlur={handlePhoneBlur}
                                placeholder="e.g. 0771234567"
                                autoComplete="tel"
                                className="mt-1 border-aerox-blue/20 focus:border-aerox-blue focus:ring-aerox-blue/30"
                              />
                              {errors.phone && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.phone.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="pickupTime" className="flex items-center text-gray-700">
                                <CalendarClock className="mr-2 h-4 w-4 text-aerox-blue/70" />
                                Pickup Time
                              </Label>
                              <select
                                id="pickupTime"
                                {...register("pickupTime")}
                                className="mt-1 block w-full h-9 rounded-md border-aerox-blue/20 shadow-sm focus:border-aerox-blue focus:ring-aerox-blue/30"
                              >
                                {getTimeSlots().map((slot) => (
                                  <option key={slot} value={slot}>
                                    {slot}
                                  </option>
                                ))}
                              </select>
                              {errors.pickupTime && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.pickupTime.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-aerox-blue/10 mt-6">
                          <h3 className="text-lg font-semibold text-aerox-blue mb-4 flex items-center">
                            <CardIcon className="mr-2 h-5 w-5 text-aerox-blue/70" />
                            Payment Details
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="cardName" className="flex items-center text-gray-700">
                                <User className="mr-2 h-4 w-4 text-aerox-blue/70" />
                                Cardholder Name
                              </Label>
                              <Input
                                id="cardName"
                                {...register("cardName")}
                                className="mt-1 border-aerox-blue/20 focus:border-aerox-blue focus:ring-aerox-blue/30"
                              />
                              {errors.cardName && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.cardName.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="cardNumber" className="flex items-center text-gray-700">
                                <CreditCard className="mr-2 h-4 w-4 text-aerox-blue/70" />
                                Card Number
                              </Label>
                              <Input
                                type="text"
                                id="cardNumber"
                                {...register("cardNumber")}
                                onChange={handleCardNumberChange}
                                maxLength={19}
                                placeholder="xxxx xxxx xxxx xxxx"
                                autoComplete="cc-number"
                                className="mt-1 border-aerox-blue/20 focus:border-aerox-blue focus:ring-aerox-blue/30"
                              />
                              {errors.cardNumber && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.cardNumber.message}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="cardExpiry" className="flex items-center text-gray-700">
                                  <Calendar className="mr-2 h-4 w-4 text-aerox-blue/70" />
                                  Expiry Date
                                </Label>
                                <Input
                                  type="text"
                                  id="cardExpiry"
                                  {...register("cardExpiry")}
                                  onChange={handleCardExpiryChange}
                                  maxLength={5}
                                  placeholder="MM/YY"
                                  autoComplete="cc-exp"
                                  className="mt-1 border-aerox-blue/20 focus:border-aerox-blue focus:ring-aerox-blue/30"
                                />
                                {errors.cardExpiry && (
                                  <p className="mt-1 text-sm text-red-600">
                                    {errors.cardExpiry.message}
                                  </p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="cardCvc" className="flex items-center text-gray-700">
                                  <ShieldCheck className="mr-2 h-4 w-4 text-aerox-blue/70" />
                                  CVC
                                </Label>
                                <Input
                                  id="cardCvc"
                                  type="password"
                                  {...register("cardCvc")}
                                  className="mt-1 border-aerox-blue/20 focus:border-aerox-blue focus:ring-aerox-blue focus:text-black/90"
                                />
                                {errors.cardCvc && (
                                  <p className="mt-1 text-sm text-red-600">
                                    {errors.cardCvc.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-aerox-blue hover:bg-aerox-blue/90 text-white px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-center mt-6"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="mr-2 h-5 w-5" />
                              Place Order
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-6">
                      <Button
                        onClick={() => navigate('/login')}
                        className="w-full bg-aerox-blue hover:bg-aerox-blue/90 text-white px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-center"
                      >
                        <User className="mr-2 h-5 w-5" />
                        Sign in to place order
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div> 
        </div> 
        </main>
        <Footer />
      </div>
    );
};

export default Cart;        