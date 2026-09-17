import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Package, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ShoppingBag, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { restaurants } from "@/data/restaurants";
import axios from 'axios';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { RestaurantOrder } from "./types";
import { Order, Reservation, ReservationRequest, Restaurant } from "@/types";
import toast from 'react-hot-toast';
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  BarChart, 
  Bar 
} from 'recharts';

const AdminRestaurant = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantOrders, setRestaurantOrders] = useState<RestaurantOrder[]>([]);
  const [restaurantReservations, setRestaurantReservations] = useState<Reservation[]>([]);
  const [restaurantRequests, setRestaurantRequests] = useState<ReservationRequest[]>([]);
  const [orderRequests, setOrderRequests] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    processingOrders: 0,
    totalReservations: 0,
    pendingRequests: 0,
    totalSales: 0,
    totalCancellations: 0,
    totalModifications: 0
  });
  
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

  // Utility: Aggregate most popular meals (Top 5)
  const getFamousMealsData = () => {
    const mealTally: Record<string, number> = {};
    restaurantOrders.forEach(order => {
      (order.itemsPurchased || []).forEach(item => {
        if (!item.name) return;
        if (!mealTally[item.name]) mealTally[item.name] = 0;
        mealTally[item.name] += Number(item.quantity) || 0;
      });
    });
    // Convert to array and sort by popularity
    return Object.entries(mealTally)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 5); // Top 5 meals
  };

  // Custom tooltip for meal chart
  const MealTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <div className="bg-white rounded shadow p-2 border text-xs">
          <strong>{name}</strong>
          <div>Orders: {value}</div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <div className="bg-white rounded shadow p-2 border text-xs">
          <strong>{name}</strong>
          <div>Count: {value}</div>
        </div>
      );
    }
    return null;
  };

  // Verify access and load restaurant data
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Check if user has access to this restaurant
    if (user?.type === "admin" && user.restaurantId !== restaurantId) {
      navigate(`/admin/restaurant/${user.restaurantId}`);
      return;
    }

    if (user?.type !== "admin" && user?.type !== "mainAdmin") {
      navigate("/");
      return;
    }

    // Get restaurant data
    if (restaurantId) {
      const restaurantData = restaurants.find(r => r.id === restaurantId);
      setRestaurant(restaurantData || null);

      // Fetch restaurant orders from backend (use restaurant name, not ID)
      if (restaurantData && restaurantData.name) {
        axios.get(`http://localhost:5000/restaurant/orders/restaurant/${encodeURIComponent(restaurantData.name)}`)
          .then(res => setRestaurantOrders(Array.isArray(res.data) ? res.data : []))
          .catch(() => setRestaurantOrders([]));
      } else {
        setRestaurantOrders([]);
      }

      // Fetch reservations and requests from backend
      axios.get(`http://localhost:5000/api/restaurant/${restaurantId}/reservations`)
        .then(res => {
          console.log('Reservations fetched successfully:', res.data);
          setRestaurantReservations(Array.isArray(res.data) ? res.data : []);
        })
        .catch(err => {
          console.error('Error fetching reservations:', err);
          setRestaurantReservations([]);
        });

      // Fetch reservation requests with error handling
      console.log('Fetching reservation requests for restaurant:', restaurantId);
      axios.get(`http://localhost:5000/api/restaurant/${restaurantId}/reservation-requests`)
        .then(res => {
          console.log('Reservation requests fetched successfully:', res.data);
          setRestaurantRequests(Array.isArray(res.data) ? res.data : []);
          // Log the state update
          setTimeout(() => {
            console.log('Current restaurantRequests state:', restaurantRequests);
          }, 100);
        })
        .catch(err => {
          console.error('Error fetching reservation requests:', err);
          setRestaurantRequests([]);
        });

      // Calculate stats (orders will be recalculated after fetch)
      // Stats for reservations and requests will be recalculated in useEffect dependencies
    }
  }, [isAuthenticated, navigate, user, restaurantId]);

  // Recalculate stats when orders update
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalOrders: restaurantOrders.length,
      processingOrders: restaurantOrders.filter(o => o.status === "processing").length,
      totalSales: getTotalSales()
    }));
  }, [restaurantOrders]);

  // Recalculate stats when reservations update
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalReservations: restaurantReservations.length
    }));
  }, [restaurantReservations]);

  // Recalculate stats when requests update
  useEffect(() => {
    const pendingCount = restaurantRequests.filter(r => r && r.status === "pending").length;
    setStats(prev => ({
      ...prev,
      pendingRequests: pendingCount,
      totalCancellations: getTotalCancellations(),
      totalModifications: getTotalModifications()
    }));
  }, [restaurantRequests]);

  // Load reservation requests for this restaurant
  useEffect(() => {
    if (restaurantId) {
      console.log(`Fetching reservation requests for restaurant ID: ${restaurantId}`);
      axios.get(`http://localhost:5000/api/restaurant/${restaurantId}/reservation-requests`)
        .then(res => {
          console.log('Reservation requests fetched:', res.data);
          if (Array.isArray(res.data)) {
            setRestaurantRequests(res.data);
            console.log(`Set ${res.data.length} reservation requests to state`);
          } else {
            console.warn('Received non-array data for reservation requests:', res.data);
            setRestaurantRequests([]);
          }
        })
        .catch(err => {
          console.error('Error fetching reservation requests:', err);
          toast.error('Failed to load reservation requests');
        });
    }
  }, [restaurantId]);

  // Load order requests for this restaurant
  useEffect(() => {
    if (restaurant && restaurant.name) {
      axios.get(`http://localhost:5000/restaurant/order-requests/restaurant/${encodeURIComponent(restaurant.name)}`)
        .then(res => setOrderRequests(Array.isArray(res.data) ? res.data : []))
        .catch(() => setOrderRequests([]));
    }
  }, [restaurant]);

  // Handle order status change
  const handleOrderStatusChange = (orderId: string, newStatus: "confirmed" | "processing" | "ready for pickup" | "picked up") => {
    // Call the API to update the order status
    axios.patch(`http://localhost:5000/restaurant/orders/status/${orderId}`, { status: newStatus })
      .then(response => {
        console.log(`Order ${orderId} status updated to ${newStatus}`);
        
        // Update the local state
        setRestaurantOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        
        // Show success message
        toast?.success(`Order status updated to ${newStatus}`);
        
        // If status is set to "ready for pickup", inform about WhatsApp notification
        if (newStatus === "ready for pickup") {
          console.log(`WhatsApp notification would be sent for order ${orderId}`);
          toast.success("A WhatsApp notification would be sent to the customer (not implemented yet)");
        }
      })
      .catch(error => {
        console.error('Error updating order status:', error);
        toast?.error("Failed to update order status");
      });
  };

  // Handle reservation request action
  const handleRequestAction = async (requestId: string, action: "approved" | "rejected") => {
    try {
      console.log(`Updating request ${requestId} to ${action}`);
      // Update request status in backend
      await axios.patch(`http://localhost:5000/api/reservation-requests/${requestId}`, { status: action });
      // Refetch reservation requests and reservations
      if (restaurantId) {
        const [requestsRes, reservationsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/restaurant/${restaurantId}/reservation-requests`),
          axios.get(`http://localhost:5000/api/restaurant/${restaurantId}/reservations`)
        ]);
        setRestaurantRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
        setRestaurantReservations(Array.isArray(reservationsRes.data) ? reservationsRes.data : []);
      }
      toast.success(`Request ${action}`);
    } catch (error) {
      console.error('Failed to update request:', error);
      toast.error('Failed to update request');
    }
  };

  // Handle order request action (modification/cancellation)
  const handleOrderRequestAction = async (requestId: string, orderId: string, action: "approved" | "rejected", type: string) => {
    try {
      // Update request status in backend
      await axios.patch(`http://localhost:5000/restaurant/order-requests/${requestId}`, { status: action });

      // If approved and type is 'cancellation', delete the order
      if (action === 'approved' && type === 'cancellation') {
        await axios.delete(`http://localhost:5000/restaurant/orders/${orderId}`);
      }

      // Refetch order requests and orders
      if (restaurant && restaurant.name) {
        const [orderRequestsRes, ordersRes] = await Promise.all([
          axios.get(`http://localhost:5000/restaurant/order-requests/restaurant/${encodeURIComponent(restaurant.name)}`),
          axios.get(`http://localhost:5000/restaurant/orders/restaurant/${encodeURIComponent(restaurant.name)}`)
        ]);
        setOrderRequests(Array.isArray(orderRequestsRes.data) ? orderRequestsRes.data : []);
        setRestaurantOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      }
      toast.success(`Order request ${action}`);
    } catch (error) {
      console.error('Failed to update order request:', error);
      toast.error('Failed to update order request');
    }
  };

  const getTotalSales = () => {
    return restaurantOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  };
  const getTotalCancellations = () => {
    return restaurantRequests.filter(req => req.type === 'cancellation').length +
           orderRequests.filter(req => req.type === 'cancellation').length;
  };
  const getTotalModifications = () => {
    return restaurantRequests.filter(req => req.type === 'modification').length +
           orderRequests.filter(req => req.type === 'modification').length;
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
            <Button asChild>
              <a href="/">Go Home</a>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Color palettes
  const mealColors = [
    '#38bdf8', // blue
    '#f472b6', // pink
    '#fb923c', // orange
    '#34d399', // green
    '#6366f1'  // indigo
  ];
  const pieColors = [
    '#38bdf8', // blue
    '#f472b6', // pink
    '#fb923c'  // orange
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold">{restaurant.name} Dashboard</h1>
              <p className="text-gray-600">{restaurant.terminal}, Shop {restaurant.location.shopNumber}</p>
            </div>
            
            {user?.type === "mainAdmin" && (
              <Button 
                variant="outline" 
                className="mt-2 md:mt-0"
                onClick={() => navigate("/admin")}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Main Admin
              </Button>
            )}
          </div>
        </div>
        
        {/* Stats Cards - Only the requested 5 metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Reservations</p>
              <p className="text-2xl font-bold">{stats.totalReservations}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center">
            <div className="rounded-full bg-indigo-100 p-3 mr-4">
              <Package className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-2xl font-bold">${stats.totalSales?.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center">
            <div className="rounded-full bg-pink-100 p-3 mr-4">
              <CheckCircle className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">All Modifications</p>
              <p className="text-2xl font-bold">{stats.totalModifications}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center">
            <div className="rounded-full bg-orange-100 p-3 mr-4">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">All Cancellations</p>
              <p className="text-2xl font-bold">{stats.totalCancellations}</p>
            </div>
          </div>
        </div>

        {/* Pie Chart: Reservations vs. Modifications vs. Cancellations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-base font-bold text-gray-700 mb-4">Reservation & Request Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Reservations', value: stats.totalReservations },
                    { name: 'Modifications', value: stats.totalModifications },
                    { name: 'Cancellations', value: stats.totalCancellations }
                  ]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                >
                  {pieColors.map((color, idx) => (
                    <Cell key={color} fill={color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} cursor={{ fill: '#f3f4f6' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom Legend for Pie Chart */}
            <div className="flex justify-center gap-6 mt-4">
              {['Reservations', 'Modifications', 'Cancellations'].map((label, idx) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg shadow-md"
                  style={{ background: 'linear-gradient(90deg, #f0f4f8 60%, #fff 100%)' }}
                >
                  <span className="inline-block w-4 h-4 rounded-full border border-gray-200 shadow" style={{ backgroundColor: pieColors[idx] }}></span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Famous Meals Chart (Bar) */}
          <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4">
            <h3 className="text-base font-bold text-gray-700 mb-4">Top 5 Famous Meals</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={getFamousMealsData()}>
                <XAxis dataKey="name" fontSize={12} tick={false} axisLine={false} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip content={<MealTooltip />} cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="value">
                  {getFamousMealsData().map((entry, idx) => (
                    <Cell key={entry.name} fill={mealColors[idx % mealColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Custom Legend for Bar Chart */}
            <div className="flex justify-center gap-6 mt-4">
              {getFamousMealsData().map((meal, idx) => (
                <div
                  key={meal.name}
                  className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg shadow-md"
                  style={{ background: 'linear-gradient(90deg, #f0f4f8 60%, #fff 100%)' }}
                >
                  <span className="inline-block w-4 h-4 rounded-full border border-gray-200 shadow" style={{ backgroundColor: mealColors[idx % mealColors.length] }}></span>
                  <span>{meal.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs for Orders, Reservations, and Requests */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-8 flex flex-wrap gap-3 justify-center bg-gradient-to-r from-blue-50 via-pink-50 to-orange-50 p-3 rounded-2xl shadow-lg">
            <TabsTrigger
              value="orders"
              className="flex items-center gap-2 text-base font-bold px-7 py-4 rounded-2xl shadow transition bg-white hover:bg-pink-100 data-[state=active]:bg-pink-500 data-[state=active]:text-white border-2 border-pink-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" /></svg>
              All Orders
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="flex items-center gap-2 text-base font-bold px-7 py-4 rounded-2xl shadow transition bg-white hover:bg-orange-100 data-[state=active]:bg-orange-500 data-[state=active]:text-white border-2 border-orange-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Customer Requests
            </TabsTrigger>
            {restaurant?.hasReservation && (
              <TabsTrigger
                value="reservations"
                className="flex items-center gap-2 text-base font-bold px-7 py-4 rounded-2xl shadow transition bg-white hover:bg-green-100 data-[state=active]:bg-green-500 data-[state=active]:text-white border-2 border-green-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a5 5 0 00-10 0v2a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2z" /></svg>
                Reservations
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="orders">
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {restaurantOrders.length > 0 ? restaurantOrders.map(order => (
                    <tr key={order._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{order._id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{order.fullName}<br /><span className="text-xs text-gray-400">{formatPhoneNumber(order.phoneNumber)}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <ul className="list-disc pl-4">
                          {order.itemsPurchased && order.itemsPurchased.map((item, index) => (
                            <li key={index}>{item.name} × {item.quantity}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">${order.totalAmount?.toFixed ? order.totalAmount.toFixed(2) : order.totalAmount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{order.pickupTime}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'ready for pickup' ? 'bg-green-100 text-green-800' : 
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                          order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' : 
                          order.status === 'picked up' ? 'bg-gray-100 text-gray-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {order.status === 'confirmed' && (
                            <Button 
                              size="sm" 
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => handleOrderStatusChange(order._id, 'processing')}
                            >
                              Mark Processing
                            </Button>
                          )}
                          {order.status === 'processing' && (
                            <Button 
                              size="sm" 
                              className="bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => handleOrderStatusChange(order._id, 'ready for pickup')}
                            >
                              Ready for Pickup
                            </Button>
                          )}
                          {order.status === 'ready for pickup' && (
                            <Button 
                              size="sm" 
                              className="bg-gray-500 hover:bg-gray-600 text-white"
                              onClick={() => handleOrderStatusChange(order._id, 'picked up')}
                            >
                              Mark as Picked Up
                            </Button>
                          )}
                          {order.status === 'picked up' && (
                            <Button 
                              size="sm" 
                              className="bg-gray-500 text-white opacity-50 cursor-not-allowed"
                            >
                              Picked Up
                            </Button>
                          )}
                          {(!order.status || (order.status !== 'confirmed' && order.status !== 'processing' && order.status !== 'ready for pickup' && order.status !== 'picked up')) && (
                            <Button 
                              size="sm" 
                              className="bg-yellow-500 hover:bg-yellow-600 text-white"
                              onClick={() => handleOrderStatusChange(order._id, 'confirmed')}
                            >
                              Confirm Order
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500">No orders found for this restaurant.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          {/* Reservations Tab */}
          {restaurant?.hasReservation && (
            <TabsContent value="reservations">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold">Table Reservations</h2>
                </div>
                
                {restaurantReservations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reservation ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Party Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {restaurantReservations.map(reservation => (
                          <tr key={reservation.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {reservation._id || reservation.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {reservation.customerName || 'N/A'}<br />
                              <span className="text-gray-500 text-xs">{formatPhoneNumber(reservation.customerPhone || '')}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              Party size: <span className="font-medium">{reservation.partySize || (reservation.seats && reservation.seats.length) || 1} people</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {new Date(reservation.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}<br />
                              <span className="text-gray-500">{reservation.time}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                reservation.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-800'
                                  : reservation.status === 'completed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-red-100 text-red-800'
                              }`}>
                                {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No reservations yet</h3>
                    <p className="text-gray-500">
                      When customers make reservations, they'll appear here.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          
          {/* Customer Requests Tab */}
          <TabsContent value="requests">
            {/* Order Requests Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Order Modification & Cancellation Requests</h2>
              </div>
              {orderRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orderRequests.map(request => (
                        <tr key={request._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${request.type === 'modification' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{request.type.charAt(0).toUpperCase() + request.type.slice(1)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{request.orderId}</td>
                          <td className="px-6 py-4 text-sm">{request.requestDetails}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${request.status === 'approved' ? 'bg-green-100 text-green-800' : request.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {request.status === 'pending' ? (
                              <div className="flex space-x-2">
                                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white flex items-center" onClick={async () => handleOrderRequestAction(request._id, request.orderId, 'approved', request.type)}>
                                  <Check className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50 flex items-center" onClick={async () => handleOrderRequestAction(request._id, request.orderId, 'rejected', request.type)}>
                                  <X className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </div>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  request.status === 'approved'
                                    ? 'bg-green-200 text-green-900 border border-green-400 shadow-sm'
                                    : 'bg-gray-200 text-gray-700 border border-gray-300 shadow-sm'
                                }`}
                                title="Processed"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" /> Processed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No order requests</h3>
                  <p className="text-gray-500">When customers request modifications or cancellations for orders, they'll appear here.</p>
                </div>
              )}
            </div>
            
            {/* Reservation Modification & Cancellation Requests */}
            {restaurant?.hasReservation && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold">Reservation Modification & Cancellation Requests</h2>
                </div>
                {restaurantRequests && restaurantRequests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reservation ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Details</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {restaurantRequests.map(request => (
                          <tr key={request.id || request._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${request.type === 'modification' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{request.restaurantName || restaurant?.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{request.reservationId}</td>
                            <td className="px-6 py-4 text-sm">{request.requestDetails || (request.type === 'modification' ? `New Time: ${request.newTime}, New Party Size: ${request.newPartySize}` : 'Cancellation request')}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                request.status === 'approved'
                                  ? 'bg-green-200 text-green-900 border border-green-400 shadow-sm'
                                  : request.status === 'rejected'
                                    ? 'bg-gray-200 text-gray-700 border border-gray-300 shadow-sm'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {request.status === 'pending' ? (
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    className="bg-green-500 hover:bg-green-600 text-white flex items-center" 
                                    onClick={() => handleRequestAction(request.id || request._id, 'approved')}
                                  >
                                    <Check className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-500 border-red-500 hover:bg-red-50 flex items-center" 
                                    onClick={() => handleRequestAction(request.id || request._id, 'rejected')}
                                  >
                                    <X className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    request.status === 'approved'
                                      ? 'bg-green-200 text-green-900 border border-green-400 shadow-sm'
                                      : 'bg-gray-200 text-gray-700 border border-gray-300 shadow-sm'
                                  }`}
                                  title="Processed"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Processed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No reservation requests</h3>
                    <p className="text-gray-500">When customers request modifications or cancellations for reservations, they'll appear here.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminRestaurant;
