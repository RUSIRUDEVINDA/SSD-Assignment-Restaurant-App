import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  User, 
  Mail, 
  CheckCircle2, 
  Plane, 
  Download, 
  Pencil, 
  X, 
  AlertTriangle, 
  Receipt, 
  CalendarClock, 
  Building, 
  ShoppingCart,
  DollarSign
} from "lucide-react";
import { PDFDownloadLink } from '@react-pdf/renderer';
import OrderReceipt from '@/components/OrderReceipt';
import OrderRequestForm from '@/components/OrderRequestForm';
import ModifyOrderForm from '@/components/ModifyOrderForm';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { OrderData } from '@/types';
import { formatPickupTime } from '@/utils/date';

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

// Wrapper components for styling buttons
const BlueButtonWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="inline-flex rounded-lg overflow-hidden border border-aerox-blue/20 hover:border-aerox-blue/40 transition-all shadow-sm hover:shadow-md">
    {children}
  </div>
);

const RedButtonWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="inline-flex rounded-lg overflow-hidden border border-red-200 hover:border-red-300 transition-all shadow-sm hover:shadow-md">
    {children}
  </div>
);

const UserOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string>('');
  const [orderRequests, setOrderRequests] = useState([]);

  const fetchOrders = async () => {
    try {
      if (!user?.email) {
        throw new Error('User not logged in');
      }

      const response = await axios.get<OrderData[]>(
        `http://localhost:5000/restaurant/orders/email/${encodeURIComponent(user.email)}`
      );
      
      const transformedOrders = response.data.map(order => ({
        ...order,
        itemsPurchased: order.itemsPurchased || [],
        totalAmount: order.totalAmount || 0,
        createdAt: order.createdAt || new Date().toISOString(),
        status: order.status || 'pending'
      }));

      setOrders(transformedOrders);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch order history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      axios.get(`http://localhost:5000/restaurant/order-requests/user/${encodeURIComponent(user.email)}`)
        .then(res => setOrderRequests(Array.isArray(res.data) ? res.data : []))
        .catch(() => setOrderRequests([]));
    }
  }, [user?.email, orders]);

  const getOrderRequest = (orderId, type) => {
    return orderRequests.find(req => req.orderId === orderId && req.type === type);
  };

  const handleOrderUpdated = () => {
    // Refresh the orders list after successful update
    fetchOrders();
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancelOrderId(orderId);
    setConfirmCancel(true);
  };

  const confirmCancellation = async (orderId: string) => {
    try {
      setLoading(true);
      await axios.delete(`http://localhost:5000/restaurant/orders/${orderId}`);
      setSuccess(true);
      setSuccessMessage('Order cancelled successfully');
      toast.success('Order cancelled successfully');
      // Refresh orders list
      fetchOrders();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setLoading(false);
      setConfirmCancel(false);
    }
  };

  useEffect(() => {
    if (success) {
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
      }, 3000);
    }
  }, [success]);

  useEffect(() => {
    fetchOrders();
    
    // Refresh orders every 30 seconds to check for status updates
    const intervalId = setInterval(() => {
      fetchOrders();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-aerox-blue/10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-aerox-blue"></div>
        <p className="text-aerox-blue/70">Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-6 text-center bg-white/80 backdrop-blur-sm rounded-xl border border-aerox-blue/10 max-w-2xl mx-auto">
        <div className="bg-white/90 p-4 rounded-full shadow-sm border border-red-100">
          <X className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-aerox-blue">Something went wrong</h3>
        <p className="text-red-600 max-w-md">{error}</p>
        <Button
          onClick={() => {
            setError(null);
            if (user?.email) {
              fetchOrders();
            }
          }}
          className="mt-2 bg-aerox-blue hover:bg-aerox-blue/90 text-white shadow-sm"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-6 text-center bg-white/80 backdrop-blur-sm rounded-xl border border-aerox-blue/10 max-w-2xl mx-auto">
        <div className="bg-white/90 p-4 rounded-full shadow-sm border border-aerox-blue/10">
          <ShoppingBag className="h-8 w-8 text-aerox-blue/70" />
        </div>
        <h3 className="text-lg font-medium text-aerox-blue">No Orders Yet</h3>
        <p className="text-gray-600 max-w-md">
          You haven't placed any orders yet. Start exploring restaurants and place your first order!
        </p>
        <Button
          onClick={() => window.location.href = '/restaurants'}
          className="mt-2 bg-aerox-blue hover:bg-aerox-blue/90 text-white shadow-sm"
        >
          Browse Restaurants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 max-w-4xl mx-auto px-4">
      <Dialog open={success} onOpenChange={setSuccess}>
        <DialogContent className="bg-white/90 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-aerox-blue flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Success!
            </DialogTitle>
            <DialogDescription>
              {successMessage}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="bg-white/90 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-aerox-blue">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Cancel Order
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => confirmCancellation(cancelOrderId)}
              disabled={loading}
            >
              {loading ? 'Cancelling...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-aerox-blue mb-6 flex items-center">
          <ShoppingCart className="mr-3 h-6 w-6 text-aerox-blue/80" />
          My Orders
        </h2>
        
        {orders.map((order) => {
          const modRequest = getOrderRequest(order._id, 'modification');
          const cancelRequest = getOrderRequest(order._id, 'cancellation');
          return (
            <div 
              key={order._id} 
              className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-aerox-blue/10 overflow-hidden transition-all duration-200 hover:shadow-md ${order.status === 'picked up' ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {/* Order Header with blue accent */}
              <div className="bg-gradient-to-r from-aerox-blue/10 to-aerox-blue/5 px-5 py-4 border-b border-aerox-blue/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-aerox-blue flex items-center">
                      <Building className="mr-2 h-5 w-5 text-aerox-blue/70" />
                      {order.restaurantName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-aerox-blue font-medium">
                        Order #{order._id.substring(0, ).toUpperCase()}
                      </span>
                      <span className="text-sm text-aerox-blue/30">•</span>
                      <span className="text-sm text-aerox-blue/70 flex items-center">
                        <CalendarClock className="mr-1 h-3 w-3" />
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
            
              </div>
            </div>

            {/* Order Content */}
            <div className="p-5">
              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-aerox-blue uppercase tracking-wider flex items-center">
                    <ShoppingBag className="mr-2 h-4 w-4 text-aerox-blue/70" />
                    Items Ordered
                  </h4>
                  <ul className="space-y-3 divide-y divide-aerox-blue/5">
                    {order.itemsPurchased.map((item, index) => (
                      <li key={index} className="flex justify-between pt-3 first:pt-0">
                        <span className="text-gray-700">
                          <span className="font-medium text-aerox-blue">{item.quantity}x</span> {item.name}
                        </span>
                        <span className="text-aerox-blue font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-aerox-blue/10">
                    <h4 className="text-sm font-medium text-aerox-blue uppercase tracking-wider mb-2 flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-aerox-blue/70" />
                      Pickup Details
                    </h4>
                    <div className="flex items-start gap-3">
                      <div className="bg-aerox-blue/5 p-2 rounded-full">
                        <Clock className="h-4 w-4 text-aerox-blue" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pickup Time</p>
                        <p className="text-aerox-blue font-medium">{formatPickupTime(order.pickupTime)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-aerox-blue/10">
                    <h4 className="text-sm font-medium text-aerox-blue uppercase tracking-wider mb-2 flex items-center">
                      <Receipt className="mr-2 h-4 w-4 text-aerox-blue/70" />
                      Order Summary
                    </h4>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-600 flex items-center">
                        <DollarSign className="mr-1 h-4 w-4 text-aerox-blue/70" />
                        Total Amount
                      </span>
                      <span className="text-xl font-bold text-aerox-blue">
                        ${order.totalAmount?.toFixed(2) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center">
                        <Clock className="mr-1 h-4 w-4 text-aerox-blue/70" />
                        Status
                      </span>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold shadow-sm select-none ` +
                        (order.status === 'ready for pickup' ? 'bg-green-100 text-green-800' :
                         order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                         order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' :
                         order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                         order.status === 'picked up' ? 'bg-green-500 text-white' :
                         'bg-gray-100 text-gray-800')
                      }>
                        {order.status === 'picked up' ? 'Picked Up' :
                         order.status === 'ready for pickup' ? '✓ Ready for Pickup' :
                         order.status === 'processing' ? 'Processing' :
                         order.status === 'confirmed' ? '✓ Confirmed' :
                         order.status === 'cancelled' ? '✕ Cancelled' :
                         '• Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Actions */}
              <div className="mt-4 pt-4 border-t border-aerox-blue/10">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={order.status === 'picked up' ? 'pointer-events-none opacity-60' : ''}>
                    <PDFDownloadLink
                      document={<OrderReceipt orderData={order} orderId={order._id} />}
                      fileName={`order_${order._id}.pdf`}
                      className="px-4 py-2 bg-aerox-blue text-white rounded-lg flex items-center gap-2 transition-all duration-200 hover:bg-aerox-blue/90 hover:shadow-md text-sm shadow-sm"
                    >
                      {({ blob, url, loading, error }) => (
                        <>
                          <Download className="h-4 w-4" />
                          {loading ? 'Generating...' : 'Download Receipt'}
                        </>
                      )}
                    </PDFDownloadLink>
                  </span>
                  {order.status !== 'picked up' && order.status !== 'ready for pickup' && (
                    <>
                      <BlueButtonWrapper>
                        {!modRequest ? (
                          <OrderRequestForm 
                            orderId={order._id}
                            type="modification"
                            onSuccess={handleOrderUpdated}
                          />
                        ) : modRequest.status === 'pending' ? (
                          <Button disabled variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            <Clock className="h-4 w-4 mr-1" />
                            Modification Pending
                          </Button>
                        ) : modRequest.status === 'approved' ? (
                          <ModifyOrderForm 
                            order={order}
                            onSuccess={handleOrderUpdated}
                            requestApproved={true}
                          />
                        ) : (
                          <Button disabled variant="outline" className="text-red-600 border-red-200 bg-red-50">
                            Modification Rejected
                          </Button>
                        )}
                      </BlueButtonWrapper>
                      <RedButtonWrapper>
                        {!cancelRequest ? (
                          <OrderRequestForm 
                            orderId={order._id}
                            type="cancellation"
                            onSuccess={handleOrderUpdated}
                          />
                        ) : cancelRequest.status === 'pending' ? (
                          <Button disabled variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            <Clock className="h-4 w-4 mr-1" />
                            Cancellation Pending
                          </Button>
                        ) : cancelRequest.status === 'approved' ? (
                          <Button 
                            onClick={() => confirmCancellation(order._id)}
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Cancel Order
                          </Button>
                        ) : (
                          <Button disabled variant="outline" className="text-red-600 border-red-200 bg-red-50">
                            Cancellation Rejected
                          </Button>
                        )}
                      </RedButtonWrapper>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
       ) })}
      </div>
    </div>
  );
}


export default UserOrders;