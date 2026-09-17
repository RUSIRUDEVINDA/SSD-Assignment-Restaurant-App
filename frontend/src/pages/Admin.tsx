import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Store, 
  LayoutDashboard, 
  ShoppingBag, 
  Calendar, 
  Package, 
  Users, 
  Edit2, 
  Trash2,
  MapPin,
  Clock,
  Plus,
  FileText,
  AlertTriangle,
  PenTool,
  Plane
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { restaurants } from "@/data/restaurants";
import { 
  orders, 
  reservations, 
  reservationRequests, 
  getReservationRequestsByRestaurant,
  getRequestsByType 
} from "@/data/orders-reservations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminReservationRequest from "@/components/AdminReservationRequest";
import AdminCancellationRequest from "@/components/AdminCancellationRequest";
import { Reservation, ReservationRequest } from "@/types";
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
import "@/styles/admin-dashboard.css";

const Admin = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Stats
  const [stats, setStats] = useState({
    totalRestaurants: restaurants.length,
    totalOrders: orders.length,
    totalReservations: reservations.length,
    reservationRestaurants: 0,
    pendingRequests: 0,
    pendingModifications: 0,
    pendingCancellations: 0,
    totalSales: 0,
    totalCancellations: 0,
    totalModifications: 0
  });
  
  const [allReservationRequests, setAllReservationRequests] = useState<ReservationRequest[]>([]);
  const [modificationRequests, setModificationRequests] = useState<ReservationRequest[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<ReservationRequest[]>([]);
  
  // Verify access and load data
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    // Check if user is main admin
    if (user?.type !== "mainAdmin") {
      // If user is restaurant admin, redirect to their restaurant dashboard
      if (user?.type === "admin" && user.restaurantId) {
        navigate(`/admin/restaurant/${user.restaurantId}`);
      } else {
        navigate("/");
      }
      return;
    }
    
    // Calculate stats
    const pendingRequestsCount = reservationRequests.filter(req => req.status === 'pending').length;
    const pendingModifications = reservationRequests.filter(req => req.status === 'pending' && req.type === 'modification').length;
    const pendingCancellations = reservationRequests.filter(req => req.status === 'pending' && req.type === 'cancellation').length;
    
    const getTotalSales = () => {
      // Sum all order totals
      return orders.reduce((sum, order) => sum + (order.total || 0), 0);
    };

    const getTotalCancellations = () => {
      // Count all cancellation requests (any status)
      return reservationRequests.filter(req => req.type === 'cancellation').length;
    };

    const getTotalModifications = () => {
      // Count all modification requests (any status)
      return reservationRequests.filter(req => req.type === 'modification').length;
    };
    
    setStats({
      totalRestaurants: restaurants.length,
      totalOrders: orders.length,
      totalReservations: reservations.length,
      reservationRestaurants: restaurants.filter(r => r.hasReservation).length,
      pendingRequests: pendingRequestsCount,
      pendingModifications,
      pendingCancellations,
      totalSales: getTotalSales(),
      totalCancellations: getTotalCancellations(),
      totalModifications: getTotalModifications(),
    });
    
    // Load all reservation requests
    setAllReservationRequests(reservationRequests);
    setModificationRequests(getRequestsByType(reservationRequests, "modification"));
    setCancellationRequests(getRequestsByType(reservationRequests, "cancellation"));
  }, [isAuthenticated, navigate, user]);
  
  const handleStatusChange = (requestId: string, newStatus: 'approved' | 'rejected') => {
    // In a real app, this would update the status in the database
    // For now, just update the local state
    const updatedRequests = allReservationRequests.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    );
    
    setAllReservationRequests(updatedRequests);
    setModificationRequests(getRequestsByType(updatedRequests, "modification"));
    setCancellationRequests(getRequestsByType(updatedRequests, "cancellation"));
    
    // Update stats
    const pendingRequestsCount = updatedRequests.filter(req => req.status === 'pending').length;
    const pendingModifications = updatedRequests.filter(req => req.status === 'pending' && req.type === 'modification').length;
    const pendingCancellations = updatedRequests.filter(req => req.status === 'pending' && req.type === 'cancellation').length;
    
    setStats(prev => ({
      ...prev,
      pendingRequests: pendingRequestsCount,
      pendingModifications,
      pendingCancellations
    }));
  };
  
  // Get restaurant name by ID
  const getRestaurantName = (restaurantId: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant ? restaurant.name : "Unknown Restaurant";
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-1 flex items-center">
          <Plane className="h-6 w-6 text-aerox-blue mr-2" />
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mb-6">Manage restaurants, orders, and reservations</p>
        
        {/* Enhanced Statistics & Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">Reservations Trend</h3>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={reservations.slice(0, 10).map((r, i) => ({ name: `#${i+1}`, value: 1 }))}>
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">Order Status</h3>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={[
                  { name: 'Orders', value: stats.totalOrders },
                  { name: 'Reservations', value: stats.totalReservations }
                ]} dataKey="value" cx="50%" cy="50%" outerRadius={40} fill="#6366f1" label>
                  <Cell fill="#38bdf8" />
                  <Cell fill="#6366f1" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">Request Breakdown</h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={[
                { name: 'Modifications', value: stats.pendingModifications },
                { name: 'Cancellations', value: stats.pendingCancellations }
              ]}>
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e42" radius={[6, 6, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-gray-500 text-sm">Restaurants</h3>
                <p className="text-2xl font-semibold">{stats.totalRestaurants}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-gray-500 text-sm">Total Orders</h3>
                <p className="text-2xl font-semibold">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-100 p-3">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-gray-500 text-sm">Reservations</h3>
                <p className="text-2xl font-semibold">{stats.totalReservations}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-amber-100 p-3">
                <PenTool className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-gray-500 text-sm">Modifications</h3>
                <p className="text-2xl font-semibold">{stats.pendingModifications}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-gray-500 text-sm">Cancellations</h3>
                <p className="text-2xl font-semibold">{stats.pendingCancellations}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-indigo-100 p-3">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-gray-500 text-sm">Total Sales</h3>
                <p className="text-2xl font-semibold">${stats.totalSales?.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-pink-100 p-3">
                <Edit2 className="h-6 w-6 text-pink-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-gray-500 text-sm">All Modifications</h3>
                <p className="text-2xl font-semibold">{stats.totalModifications}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-orange-100 p-3">
                <Trash2 className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-gray-500 text-sm">All Cancellations</h3>
                <p className="text-2xl font-semibold">{stats.totalCancellations}</p>
              </div>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="restaurants" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="restaurants" className="flex-1">Restaurants</TabsTrigger>
            <TabsTrigger value="modifications" className="flex-1">Modification Requests</TabsTrigger>
            <TabsTrigger value="cancellations" className="flex-1">Cancellation Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="restaurants">
            {/* Restaurant Management */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Restaurant Management</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Restaurant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Features
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {restaurants.map(restaurant => (
                      <tr key={restaurant.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img 
                                className="h-10 w-10 rounded-full" 
                                src={restaurant.images[0]} 
                                alt={restaurant.name} 
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                              <div className="text-sm text-gray-500">{restaurant.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                            {restaurant.terminal}, Shop {restaurant.location.shopNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            {restaurant.hours.open} - {restaurant.hours.close}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {restaurant.contact.phone}<br />
                          <span className="text-xs">{restaurant.contact.email}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {restaurant.hasReservation ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Reservations Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Pre-Order Only
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link to={`/admin/restaurant/${restaurant.id}`}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center text-black"
                              >
                                <LayoutDashboard className="h-4 w-4 mr-1" />
                                Dashboard
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="modifications">
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <PenTool className="h-5 w-5 text-amber-600 mr-2" />
                Modification Requests
              </h2>
              {modificationRequests.length > 0 ? (
                <div className="space-y-4">
                  {modificationRequests.map(request => {
                    // Find the associated reservation
                    const reservation = reservations.find(r => r.id === request.reservationId);
                    if (!reservation) return null;
                    return (
                      <AdminReservationRequest
                        key={request.id}
                        request={request}
                        reservation={reservation}
                        restaurantName={getRestaurantName(reservation.restaurantId)}
                        onStatusChange={handleStatusChange}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PenTool className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No modification requests</h3>
                  <p className="text-gray-500">
                    There are no reservation modification requests at this time.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="cancellations">
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                Cancellation Requests
              </h2>
              {cancellationRequests.length > 0 ? (
                <div className="space-y-4">
                  {cancellationRequests.map(request => {
                    // Try to find the associated reservation (may be deleted)
                    const reservation = reservations.find(r => r.id === request.reservationId);
                    // Use info from the reservation if available, otherwise fall back to request
                    return (
                      <AdminCancellationRequest
                        key={request.id}
                        id={request.id}
                        reservationId={request.reservationId}
                        restaurantName={reservation ? getRestaurantName(reservation.restaurantId) : request.restaurantName}
                        customerName={reservation ? reservation.customerInfo.name : (request.customerName || "Unknown")}
                        date={reservation ? reservation.date : (request.newDate || "Unknown")}
                        time={reservation ? reservation.time : (request.newTime || "Unknown")}
                        reason={request.requestDetails}
                        status={request.status as 'pending' | 'approved' | 'rejected'}
                        onStatusChange={handleStatusChange}
                        deletedReservation={!reservation}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No cancellation requests</h3>
                  <p className="text-gray-500">
                    There are no reservation cancellation requests at this time.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
