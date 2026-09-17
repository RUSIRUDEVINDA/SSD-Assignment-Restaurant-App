import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  Package, 
  Calendar, 
  User as UserIcon, 
  Mail, 
  Phone, 
  FileEdit,
  ShieldCheck,
  Clock,
  CalendarDays,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { getOrdersByUser } from "@/data/orders-reservations";
import toast from "react-hot-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Order, Reservation, ReservationRequest, Restaurant } from "@/types";
import { restaurants as restaurantsData } from "@/data/restaurants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReservationRequestForm from "@/components/ReservationRequestForm";
import ModifyReservationForm from "@/components/ModifyReservationForm";
import UserOrders from '@/components/UserOrders';

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

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationRequests, setReservationRequests] = useState<ReservationRequest[]>([]);
  const [orderRequests, setOrderRequests] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<Record<string, Restaurant>>({});
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [requestType, setRequestType] = useState<"modification" | "cancellation">("modification");
  const [isLoading, setIsLoading] = useState(true);
  // Filters for My Requests tab
  const [requestFilter, setRequestFilter] = useState<"all" | "reservation" | "order">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  // Track which reservations have been modified
  const [modifiedReservations, setModifiedReservations] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('modifiedReservations');
    return saved ? JSON.parse(saved) : {};
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Persist modifiedReservations to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('modifiedReservations', JSON.stringify(modifiedReservations));
  }, [modifiedReservations]);
  
  // Fetch user reservations and requests
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      console.log('Fetching reservations for user email:', user.email);
      
      // First fetch reservations
      axios.get(`http://localhost:5000/api/reservations?userEmail=${user.email}`)
        .then(res => {
          console.log('Reservations fetched:', res.data);
          setReservations(Array.isArray(res.data) ? res.data : []);
          
          // Skip fetching restaurants since the endpoint doesn't exist
          // Instead, use the restaurant names from the reservations
          const reservationData = Array.isArray(res.data) ? res.data : [];
          const restaurantMap: Record<string, any> = {};
          
          // Create a map of restaurant IDs to names from the reservation data
          reservationData.forEach(reservation => {
            if (reservation.restaurantId && reservation.restaurantName) {
              restaurantMap[reservation.restaurantId] = { 
                id: reservation.restaurantId,
                name: reservation.restaurantName 
              };
            }
          });
          
          setRestaurants(restaurantMap);
          
          // Now fetch reservation requests with the correct endpoint
          console.log('Fetching reservation requests for user email:', user.email);
          return axios.get(`http://localhost:5000/api/reservation-requests?userEmail=${user.email}`);
        })
        .then(res => {
          console.log('Reservation requests fetched:', res.data);
          const requestData = Array.isArray(res.data) ? res.data : [];
          
          // Log request reservation IDs for debugging
          console.log('Request reservation IDs:', requestData.map(req => req.reservationId));
          console.log('Full reservation request data:', requestData);
          
          setReservationRequests(requestData);
          
          // Finally fetch order requests
          return axios.get(`http://localhost:5000/restaurant/order-requests/user/${encodeURIComponent(user.email)}`);
        })
        .then(res => {
          console.log('Order requests fetched:', res.data);
          const orderRequestData = Array.isArray(res.data) ? res.data : [];
          console.log('Full order request data:', orderRequestData);
          
          setOrderRequests(orderRequestData);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching user data:", err);
          setIsLoading(false);
        });
    }
  }, [user]);

  // Refresh reservations whenever reservation requests change
  useEffect(() => {
    if (user && reservationRequests.length > 0) {
      console.log('Refreshing reservations after request status change');
      axios.get(`http://localhost:5000/api/reservations?userEmail=${user.email}`)
        .then(res => {
          console.log('Reservations refreshed:', res.data);
          const reservationData = Array.isArray(res.data) ? res.data : [];
          
          // Check for any reservations with approved modification requests
          const approvedModifications = reservationRequests.filter(
            req => req.type === 'modification' && req.status === 'approved'
          );
          
          // Log approved modifications for debugging
          if (approvedModifications.length > 0) {
            console.log('Found approved modification requests:', approvedModifications);
            console.log('Current reservations:', reservationData);
          }
          
          // Update reservation statuses based on approved requests
          const updatedReservations = reservationData.map(reservation => {
            const reservationId = reservation.id || reservation._id;
            console.log(`Checking reservation ${reservationId} with status ${reservation.status}`);
            
            const modRequest = approvedModifications.find(
              req => req.reservationId === reservationId
            );
            
            if (modRequest) {
              console.log(`Found approved modification request for reservation ${reservationId}`);
              
              // Only set to 'approved' if it's not already modified
              if (reservation.status !== 'modified') {
                console.log(`Setting reservation ${reservationId} status to 'approved' for modification`);
                return { ...reservation, status: 'approved' };
              } else {
                console.log(`Reservation ${reservationId} is already modified, not changing status`);
              }
            }
            
            return reservation;
          });
          
          console.log('Updated reservations:', updatedReservations);
          setReservations(updatedReservations);
        })
        .catch(err => {
          console.error("Error refreshing reservations:", err);
        });
    }
  }, [user, reservationRequests]);

  // Handle requesting a cancellation (first step)  
  const handleCancelRequest = (reservation: Reservation) => {
    setActiveReservation(reservation);
    setRequestType("cancellation");
    setRequestDialogOpen(true);
  };
  
  // Handle requesting a modification (first step)
  const handleModifyRequest = (reservation: Reservation) => {
    setActiveReservation(reservation);
    setRequestType("modification");
    setRequestDialogOpen(true);
  };
  
  // Submit a reservation request to the backend
  const submitReservationRequest = async (reservationId: string, type: string, data: any) => {
    try {
      setIsLoading(true);
      const requestData = {
        reservationId,
        type,
        requestDetails: data.requestDetails,
        status: 'pending',
      };
      
      console.log('Submitting reservation request:', requestData);
      
      // Send the request to the backend
      await axios.post(`http://localhost:5000/api/restaurant/${reservationId}/reservation-requests`, requestData);
      
      toast.success(`${type === 'modification' ? 'Modification' : 'Cancellation'} request submitted successfully`);
      
      // Refresh the reservation requests and order requests
      if (user) {
        const reservationResponse = await axios.get(`http://localhost:5000/api/reservation-requests?userEmail=${user.email}`);
        setReservationRequests(Array.isArray(reservationResponse.data) ? reservationResponse.data : []);
        
        const orderResponse = await axios.get(`http://localhost:5000/restaurant/order-requests/user/${encodeURIComponent(user.email)}`);
        setOrderRequests(Array.isArray(orderResponse.data) ? orderResponse.data : []);
      }
    } catch (error) {
      console.error(`Error submitting ${type} request:`, error);
      toast.error(`Failed to submit ${type} request. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle actually canceling a reservation after approval
  const handleCancelReservation = async (reservationId: string) => {
    try {
      console.log('Cancelling reservation:', reservationId);
      
      // Send DELETE request to the backend
      await axios.delete(`http://localhost:5000/api/reservations/${reservationId}`);
      
      // Update the reservation status locally to 'deleted'
      setReservations(prevReservations => 
        prevReservations.map(res => 
          (res.id === reservationId || res._id === reservationId)
            ? { ...res, status: 'deleted' }
            : res
        )
      );
      
      // Refresh the reservation requests to update their status
      if (user) {
        const requestsResponse = await axios.get(`http://localhost:5000/api/reservation-requests?userEmail=${user.email}`);
        setReservationRequests(Array.isArray(requestsResponse.data) ? requestsResponse.data : []);
      }
      
      toast.success('Reservation deleted successfully');
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error('Failed to delete reservation');
    }
  };
  
  // Handle opening the modification form after approval
  const handleModifyReservation = (reservationId: string) => {
    console.log('handleModifyReservation called for:', reservationId);
    
    // Find the reservation to modify
    const reservation = reservations.find(res => 
      (res.id === reservationId || res._id === reservationId)
    );
    
    if (!reservation) {
      console.error('Reservation not found for ID:', reservationId);
      toast.error('Reservation not found');
      return;
    }
    
    console.log('Found reservation to modify:', reservation);
    
    // Set the active reservation and open the modify dialog
    setActiveReservation(reservation);
    setModifyDialogOpen(true);
  };
  
  // Handle saving the modified reservation
  const handleSaveModification = async (data: any) => {
    if (!data || !activeReservation) {
      setModifyDialogOpen(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const reservationId = activeReservation.id || activeReservation._id;
      
      console.log('Saving modifications for reservation:', reservationId, data);
      
      // Apply the modifications
      const updates: any = {};
      if (data.newTime) updates.time = data.newTime;
      if (data.newPartySize) updates.partySize = data.newPartySize;
      if (data.newDate) updates.date = data.newDate;
      
      console.log('Updates to apply:', updates);
      
      // Save to backend and set status to 'modified'
      await axios.patch(`http://localhost:5000/api/reservations/${reservationId}/modify`, updates);
      
      // Mark as modified in state (and persist) ONLY after actual modification
      setReservations(prev =>
        prev.map(res =>
          (res.id === reservationId || res._id === reservationId)
            ? { ...res, ...updates, status: 'modified' }
            : res
        )
      );
      // Refresh reservations from backend to get updated status
      if (user) {
        const reservationsRes = await axios.get(`http://localhost:5000/api/reservations?userEmail=${user.email}`);
        setReservations(Array.isArray(reservationsRes.data) ? reservationsRes.data : []);
      }
      setModifiedReservations(prev => {
        const updated = { ...prev, [reservationId]: true };
        localStorage.setItem('modifiedReservations', JSON.stringify(updated));
        return updated;
      });
      
      // Refresh the reservation requests to update their status
      if (user) {
        const requestsResponse = await axios.get(`http://localhost:5000/api/reservation-requests?userEmail=${user.email}`);
        setReservationRequests(Array.isArray(requestsResponse.data) ? requestsResponse.data : []);
      }
      
      toast.success('Reservation modified successfully');
      setModifyDialogOpen(false);
      setActiveReservation(null);
    } catch (error) {
      console.error('Error modifying reservation:', error);
      toast.error('Failed to modify reservation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestComplete = (data?: any) => {
    if (data && activeReservation) {
      // Submit the request to the backend
      const reservationId = activeReservation.id || activeReservation._id;
      submitReservationRequest(reservationId, requestType, data);
    }
    
    // Close the dialog
    setRequestDialogOpen(false);
    setActiveReservation(null);
  };
  
  const getRestaurantName = (reservation: Reservation) => {
    // First try to use the stored restaurant name from the reservation
    if (reservation.restaurantName) {
      return reservation.restaurantName;
    }
    
    // If no restaurant name is stored, try to get it from our fetched restaurants
    const restaurantId = reservation.restaurantId;
    if (!restaurantId) return 'Unknown Restaurant';
    
    if (restaurants[restaurantId]) {
      return restaurants[restaurantId].name;
    }
    
    // Fallback for when no data is available
    return `Restaurant ${restaurantId}`;
  };
  
  // Filter requests based on selected filters
  const getFilteredRequests = () => {
    // Filter reservation requests
    let filteredReservationRequests = [...reservationRequests];
    let filteredOrderRequests = [...orderRequests];
    
    // Apply status filter to both
    if (statusFilter !== "all") {
      filteredReservationRequests = filteredReservationRequests.filter(
        req => req.status === statusFilter
      );
      filteredOrderRequests = filteredOrderRequests.filter(
        req => req.status === statusFilter
      );
    }
    
    // Apply request type filter
    if (requestFilter === "reservation") {
      return { 
        reservationRequests: filteredReservationRequests, 
        orderRequests: [] 
      };
    } else if (requestFilter === "order") {
      return { 
        reservationRequests: [], 
        orderRequests: filteredOrderRequests 
      };
    }
    
    // Return all filtered requests
    return { 
      reservationRequests: filteredReservationRequests, 
      orderRequests: filteredOrderRequests 
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-pink-50 to-orange-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-aerox-blue mb-2 tracking-tight drop-shadow">My Profile</h1>
            <p className="text-lg text-gray-500 font-medium">Welcome back, <span className="text-aerox-blue font-semibold">{user?.name || "User"}</span>!</p>
          </div>
        </div>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-8 flex flex-wrap gap-4 justify-center bg-gradient-to-r from-blue-100 via-pink-100 to-orange-100 p-3 rounded-2xl shadow-lg">
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 text-base font-bold px-7 py-4 rounded-2xl shadow transition bg-white hover:bg-blue-100 data-[state=active]:bg-aerox-blue data-[state=active]:text-white border-2 border-blue-200"
            >
              <UserIcon className="h-5 w-5" /> Profile
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="flex items-center gap-2 text-base font-bold px-7 py-4 rounded-2xl shadow transition bg-white hover:bg-pink-100 data-[state=active]:bg-pink-500 data-[state=active]:text-white border-2 border-pink-200"
            >
              <Package className="h-5 w-5" /> Orders
            </TabsTrigger>
            <TabsTrigger
              value="reservations"
              className="flex items-center gap-2 text-base font-bold px-7 py-4 rounded-2xl shadow transition bg-white hover:bg-green-100 data-[state=active]:bg-green-500 data-[state=active]:text-white border-2 border-green-200"
            >
              <Calendar className="h-5 w-5" /> Reservations
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="flex items-center gap-2 text-base font-bold px-7 py-4 rounded-2xl shadow transition bg-white hover:bg-orange-100 data-[state=active]:bg-orange-500 data-[state=active]:text-white border-2 border-orange-200"
            >
              <FileEdit className="h-5 w-5" /> My Requests
            </TabsTrigger>
          </TabsList>
          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-aerox-blue/10">
              <div className="flex items-center mb-8">
                <h1 className="text-3xl font-bold text-aerox-blue">My Profile</h1>
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 pb-6 border-b border-aerox-blue/10">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-aerox-blue text-white flex items-center justify-center">
                    <UserIcon className="h-14 w-14 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-aerox-blue mb-2">{user?.name || "User"}</h2>
                  <p className="text-gray-600 flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-aerox-blue/70" />
                    {user?.email || "No email provided"}
                  </p>
                  <p className="text-gray-600 flex items-center mt-1">
                    <Phone className="h-4 w-4 mr-2 text-aerox-blue/70" />
                    {formatPhoneNumber(user?.phone) || "No phone provided"}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-aerox-blue mb-2">Personal Information</h2>
                <p className="text-gray-600">Manage your account details and contact information</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Field */}
                  <div className="space-y-2 bg-white/90 p-4 rounded-lg border border-aerox-blue/10">
                    <div className="flex items-center text-aerox-blue mb-1">
                      <UserIcon className="h-5 w-5 mr-2" />
                      <span className="font-medium">Full Name</span>
                    </div>
                    <p className="text-gray-800 text-lg font-medium">
                      {user?.name || "Not provided"}
                    </p>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2 bg-white/90 p-4 rounded-lg border border-aerox-blue/10">
                    <div className="flex items-center text-aerox-blue mb-1">
                      <Mail className="h-5 w-5 mr-2" />
                      <span className="font-medium">Email Address</span>
                    </div>
                    <p className="text-gray-800 text-lg break-all">
                      {user?.email || "Not provided"}
                    </p>
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-2 bg-white/90 p-4 rounded-lg border border-aerox-blue/10">
                    <div className="flex items-center text-aerox-blue mb-1">
                      <Phone className="h-5 w-5 mr-2" />
                      <span className="font-medium">Phone Number</span>
                    </div>
                    <p className="text-gray-800 text-lg">
                      {formatPhoneNumber(user?.phone) || "Not provided"}
                    </p>
                  </div>
                  
                  {/* Account Type */}
                  <div className="space-y-2 bg-white/90 p-4 rounded-lg border border-aerox-blue/10">
                    <div className="flex items-center text-aerox-blue mb-1">
                      <UserIcon className="h-5 w-5 mr-2" />
                      <span className="font-medium">Account Type</span>
                    </div>
                    <p className="text-gray-800 text-lg capitalize">
                      {user?.type || "Customer"}
                    </p>
                  </div>
                </div>

                {/* Security Note */}
                <div className="mt-8 p-4 bg-aerox-blue/5 rounded-lg border border-aerox-blue/20">
                  <div className="flex items-start">
                    <ShieldCheck className="h-5 w-5 text-aerox-blue mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-aerox-blue">Account Security</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        For security reasons, contact information can only be changed by contacting our support team.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-aerox-blue/10">
              <UserOrders />
            </div>
          </TabsContent>
          
          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-aerox-blue/10">
              <h2 className="text-xl font-semibold text-aerox-blue mb-6 flex items-center">
                <CalendarDays className="h-5 w-5 mr-2" />
                My Reservations
              </h2>
              
              {reservations.length > 0 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {reservations.map((reservation, index) => (
                      <div key={index} className="border border-aerox-blue/10 rounded-lg p-4 bg-white/90 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-aerox-blue">{getRestaurantName(reservation)}</h3>
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <Calendar className="h-4 w-4 mr-1 text-aerox-blue/70" />
                              Table Reservation
                            </p>
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <Clock className="h-4 w-4 mr-1 text-aerox-blue/70" />
                              {reservation.time}
                            </p>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              reservation.status === 'booked' 
                                ? 'bg-aerox-blue/10 text-aerox-blue'
                                : reservation.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : reservation.status === 'modified'
                                    ? 'bg-green-100 text-green-800'
                                    : reservation.status === 'deleted'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-red-100 text-red-800'
                            }`}>
                              {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          <p className="text-gray-600">Reservation ID: <Link to={`/reservation/${reservation.id || reservation._id}`} className="font-medium text-aerox-blue hover:underline">{reservation.id || reservation._id}</Link></p>
                          <p className="text-gray-600">Party size: <span className="font-medium text-aerox-blue">{reservation.partySize || 1} people</span></p>
                          <p className="text-gray-600">Reserved for: <span className="font-medium text-aerox-blue">{reservation.customerName || user?.name}</span></p>
                          <p className="text-gray-600">Contact: <span className="font-medium text-aerox-blue">{reservation.customerPhone || user?.phone}</span></p>
                        </div>
                        
                        <div className="mt-4 flex flex-wrap gap-2">
                          {/* MODIFICATION BUTTON LOGIC */}
                          {(() => {
                            // Shared cancellation request logic for this reservation
                            const cancelRequests = reservationRequests.filter(req => 
                              (req.reservationId === reservation.id || req.reservationId === reservation._id) && 
                              req.type === 'cancellation'
                            );
                            const latestCancelRequest = cancelRequests.length > 0 ? cancelRequests[cancelRequests.length - 1] : null;
                            
                            // Check if reservation is cancelled or has approved cancellation request
                            if (
                              reservation.status === 'deleted' ||
                              reservation.status === 'cancelled' ||
                              (latestCancelRequest && latestCancelRequest.status === 'approved')
                            ) {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={true}
                                  className="text-gray-400 border-gray-200 bg-gray-50"
                                >
                                  <FileEdit className="h-4 w-4 mr-1" />
                                  Reservation Cancelled
                                </Button>
                              );
                            }

                            // Find the latest modification request for this reservation
                            const modRequests = reservationRequests.filter(req => 
                              (req.reservationId === reservation.id || req.reservationId === reservation._id) && 
                              req.type === 'modification'
                            );
                            const latestModRequest = modRequests.length > 0 ? modRequests[modRequests.length - 1] : null;

                            // Check if this reservation has already been modified (only after actual modification)
                            const isAlreadyModified = reservation.status === 'modified';
                            const isApproved = reservation.status === 'approved' || (latestModRequest && latestModRequest.status === 'approved');

                            console.log(`Reservation ${reservation.id || reservation._id} status: ${reservation.status}, isApproved: ${isApproved}, latestModRequest:`, latestModRequest);

                            if (isAlreadyModified) {
                              // Already modified - show disabled button
                              return (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={true}
                                  className="text-gray-500 border-gray-300 bg-gray-100"
                                >
                                  <FileEdit className="h-4 w-4 mr-1" />
                                  Already Modified
                                </Button>
                              );
                            } else if (latestModRequest && latestModRequest.status === 'rejected') {
                              // Modification request rejected
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={true}
                                  className="text-red-600 border-red-200 bg-red-50"
                                >
                                  Modification Rejected
                                </Button>
                              );
                            } else if (isApproved) {
                              // Approved modification request - allow actual modification
                              console.log('Showing Modify Reservation button for:', reservation.id || reservation._id);
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    console.log('Modify button clicked for reservation:', reservation.id || reservation._id);
                                    handleModifyReservation(reservation.id || reservation._id);
                                  }}
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  <FileEdit className="h-4 w-4 mr-1" />
                                  Modify Reservation
                                </Button>
                              );
                            } else if (latestModRequest && latestModRequest.status === 'pending') {
                              // Disable modification request if pending
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={true}
                                  className="text-amber-600 border-amber-200 bg-amber-50 cursor-not-allowed"
                                >
                                  <Clock className="h-4 w-4 mr-1 animate-pulse" />
                                  Pending Modification
                                </Button>
                              );
                            } else {
                              // Normal state - request modification
                              return (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleModifyRequest(reservation)}
                                  className="text-aerox-blue border-aerox-blue/20 hover:bg-aerox-blue/5"
                                >
                                  <FileEdit className="h-4 w-4 mr-1" />
                                  Request Modification
                                </Button>
                              );
                            }
                          })()}
                          
                          {/* CANCELLATION BUTTON LOGIC */}
                          {(() => {
                            // Shared cancellation request logic for this reservation
                            const cancelRequests = reservationRequests.filter(req => 
                              (req.reservationId === reservation.id || req.reservationId === reservation._id) && 
                              req.type === 'cancellation'
                            );
                            const latestCancelRequest = cancelRequests.length > 0 ? cancelRequests[cancelRequests.length - 1] : null;
                            
                            // Check if reservation is cancelled or has approved cancellation request
                            if (
                              reservation.status === 'deleted' ||
                              reservation.status === 'cancelled' ||
                              (latestCancelRequest && latestCancelRequest.status === 'approved')
                            ) {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={true}
                                  className="text-gray-400 border-gray-200 bg-gray-50"
                                >
                                  <FileEdit className="h-4 w-4 mr-1" />
                                  Reservation Cancelled
                                </Button>
                              );
                            }

                            if (latestCancelRequest && latestCancelRequest.status === 'pending') {
                              // Pending cancellation request
                              return (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={true}
                                  className="text-amber-600 border-amber-200 bg-amber-50 cursor-not-allowed"
                                >
                                  <Clock className="h-4 w-4 mr-1 animate-pulse" />
                                  Pending Cancellation
                                </Button>
                              );
                            } else if (latestCancelRequest && latestCancelRequest.status === 'rejected') {
                              // Rejected cancellation request
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={true}
                                  className="text-red-600 border-red-200 bg-red-50"
                                >
                                  Cancellation Rejected
                                </Button>
                              );
                            } else {
                              // Normal state - request cancellation
                              return (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCancelRequest(reservation)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  Request Cancellation
                                </Button>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-white/70 rounded-lg">
                  <Calendar className="h-16 w-16 text-aerox-blue/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-aerox-blue mb-2">No reservations yet</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't made any table reservations yet.
                  </p>
                  <Button asChild className="bg-aerox-blue hover:bg-aerox-blue/90 text-white">
                    <Link to="/restaurants">Find Restaurants</Link>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* My Requests Tab */}
          <TabsContent value="requests">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-aerox-blue/10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <h2 className="text-xl font-semibold text-aerox-blue flex items-center">
                  <FileEdit className="h-5 w-5 mr-2" />
                  My Requests
                </h2>
                
                {/* Filter controls */}
                <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Request Type:</span>
                    <Select 
                      value={requestFilter} 
                      onValueChange={(value) => setRequestFilter(value as "all" | "reservation" | "order")}
                    >
                      <SelectTrigger className="w-[140px] h-9 text-sm">
                        <SelectValue placeholder="All Requests" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Requests</SelectItem>
                        <SelectItem value="reservation">Reservation</SelectItem>
                        <SelectItem value="order">Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Select 
                      value={statusFilter} 
                      onValueChange={(value) => setStatusFilter(value as "all" | "pending" | "approved" | "rejected")}
                    >
                      <SelectTrigger className="w-[140px] h-9 text-sm">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {(() => {
                const { reservationRequests: filteredReservationRequests, orderRequests: filteredOrderRequests } = getFilteredRequests();
                console.log('Filtered reservation requests:', filteredReservationRequests);
                console.log('Filtered order requests:', filteredOrderRequests);
                
                const hasRequests = filteredReservationRequests.length > 0 || filteredOrderRequests.length > 0;
                
                if (!hasRequests) {
                  return (
                    <div className="text-center py-12 bg-white/70 rounded-lg">
                      <FileEdit className="h-16 w-16 text-aerox-blue/30 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-aerox-blue mb-2">No matching requests</h3>
                      <p className="text-gray-600 mb-4">
                        {(reservationRequests.length > 0 || orderRequests.length > 0) 
                          ? "No requests match your current filters." 
                          : "You haven't made any requests yet."}
                      </p>
                      {(reservationRequests.length > 0 || orderRequests.length > 0) && (
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setRequestFilter("all");
                            setStatusFilter("all");
                          }}
                          className="bg-aerox-blue/5 hover:bg-aerox-blue/10 border-aerox-blue/20 text-aerox-blue"
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {filteredReservationRequests && filteredReservationRequests.map((request, index) => (
                        <div key={`reservation-request-${index}`} className="border border-aerox-blue/10 rounded-lg p-4 bg-white/90 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-aerox-blue">
                                Reservation {request.type === 'modification' ? 'Modification Request' : 'Cancellation Request'}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {request.createdAt ? format(new Date(request.createdAt), 'MMM d, yyyy') : 'Date not available'}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              request.status === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="mt-2 text-sm space-y-1">
                            <p>
                              <span className="font-medium text-aerox-blue">Reservation ID:</span>{' '}
                              <Link to={`/reservation/${request.reservationId}`} className="text-aerox-blue hover:underline">
                                {request.reservationId}
                              </Link>
                            </p>
                            {request.restaurantName && (
                              <p>
                                <span className="font-medium text-aerox-blue">Restaurant:</span>{' '}
                                <span className="text-gray-800">{request.restaurantName}</span>
                              </p>
                            )}
                            <p>
                              <span className="font-medium text-aerox-blue">Request Details:</span>{' '}
                              <span className="text-gray-800">{request.requestDetails || 'No details provided'}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {filteredOrderRequests && filteredOrderRequests.map((request, index) => (
                        <div key={`order-request-${index}`} className="border border-aerox-blue/10 rounded-lg p-4 bg-white/90 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-aerox-blue">
                                Order {request.type === 'modification' ? 'Modification Request' : 'Cancellation Request'}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {request.createdAt ? format(new Date(request.createdAt), 'MMM d, yyyy') : 'Date not available'}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              request.status === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="mt-2 text-sm space-y-1">
                            <p>
                              <span className="font-medium text-aerox-blue">Order ID:</span>{' '}
                              <span className="text-aerox-blue">
                                {request.orderId}
                              </span>
                            </p>
                            <p>
                              <span className="font-medium text-aerox-blue">Request Details:</span>{' '}
                              <span className="text-gray-800">{request.requestDetails || 'No details provided'}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
      
      {/* Request Dialog - Initial request for modification/cancellation */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {requestType === 'modification' ? 'Request Reservation Modification' : 'Request Reservation Cancellation'}
            </DialogTitle>
          </DialogHeader>
          {activeReservation && (
            <ReservationRequestForm
              reservation={activeReservation}
              type={requestType}
              onSuccess={handleRequestComplete}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modify Dialog - After admin approval */}
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modify Reservation</DialogTitle>
          </DialogHeader>
          {activeReservation && (
            <ModifyReservationForm
              reservation={activeReservation}
              onSuccess={handleSaveModification}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;