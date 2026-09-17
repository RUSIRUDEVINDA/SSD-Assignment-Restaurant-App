import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, MapPin, Clock, Phone, User, Mail, CheckCircle2, Plane, Download } from "lucide-react";
import OrderReceipt from '@/components/OrderReceipt';
import { PDFDownloadLink } from '@react-pdf/renderer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface OrderData {
  _id: string;
  restaurantName: string;
  itemsPurchased: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  pickupTime: string;
  createdAt: string;
  status?: 'confirmed' | 'processing' | 'ready for pickup' | 'pending' | 'cancelled' | 'picked up' | 'completed';
  modifiedAt?: string | null;
}

const OrderSummary: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const date = new Date();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const orderId = location.state?.orderId;

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        const response = await axios.get<OrderData>(`http://localhost:5000/restaurant/orders/${orderId}`);
        setOrderData(response.data);
      } catch (err) {
        setError('Failed to fetch order details');
        console.error('Error fetching order details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-aerox-blue/5">
        <Header />
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto">
              <div className="text-center bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-md">
                <h1 className="text-2xl font-bold text-aerox-blue mb-4">
                  Loading Order Details...
                </h1>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aerox-blue mx-auto"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-aerox-blue/5">
        <Header />
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto">
              <div className="text-center bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-md">
                <h1 className="text-2xl font-bold text-aerox-blue mb-4">
                  Error
                </h1>
                <p className="text-red-600">{error}</p>
                <Button
                  onClick={() => navigate('/cart')}
                  className="mt-4 bg-aerox-blue hover:bg-aerox-blue/90 text-white"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-aerox-blue/5">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm">
              <CheckCircle2 className="mx-auto h-14 w-14 text-aerox-blue" />
              <h1 className="mt-3 text-3xl font-bold text-aerox-blue">
                Order Confirmed!
              </h1>
              <p className="mt-2 text-base text-gray-600">
                Your order has been successfully placed. We'll notify you when it's ready for pickup.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-aerox-blue/10">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-aerox-blue mb-4 border-b border-aerox-blue/10 pb-2">
                  Order Details
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Order ID</span>
                    <span className="text-sm font-medium text-aerox-blue">#{orderId}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Restaurant</span>
                    <span className="text-sm font-medium text-aerox-blue">{orderData.restaurantName}</span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-aerox-blue">Items Ordered</h3>
                    {orderData.itemsPurchased.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-aerox-blue/5 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="text-xs text-gray-500">x{item.quantity}</span>
                        </div>
                        <span className="text-sm font-medium text-aerox-blue">${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-aerox-blue/10 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-aerox-blue">Total Amount</span>
                      <span className="text-sm font-bold text-aerox-blue">${orderData.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-aerox-blue/70 mr-2" />
                      <span className="text-sm text-gray-600">Pickup Time</span>
                    </div>
                    <span className="text-sm font-medium text-aerox-blue">{orderData.pickupTime}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-aerox-blue/70 mr-2" />
                      <span className="text-sm text-gray-600">Full Name</span>
                    </div>
                    <span className="text-sm font-medium text-aerox-blue">{orderData.fullName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-aerox-blue/70 mr-2" />
                      <span className="text-sm text-gray-600">Email</span>
                    </div>
                    <span className="text-sm font-medium text-aerox-blue">{orderData.email}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-aerox-blue/70 mr-2" />
                      <span className="text-sm text-gray-600">Phone Number</span>
                    </div>
                    <span className="text-sm font-medium text-aerox-blue">{orderData.phoneNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <PDFDownloadLink
                document={<OrderReceipt orderData={orderData} orderId={orderId} />}
                fileName={`order_${orderId}.pdf`}
                className="w-full bg-white hover:bg-white/90 text-aerox-blue border border-aerox-blue/20 text-sm px-4 py-3 rounded-lg flex items-center justify-center shadow-sm transition-all duration-200"
              >
                {({ blob, url, loading, error }) => (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {loading ? 'Generating PDF...' : 'Download Receipt'}
                  </>
                )}
              </PDFDownloadLink>

              <Button
                onClick={() => navigate('/restaurants')}
                className="mt-4 w-full bg-aerox-blue hover:bg-aerox-blue/90 text-white text-sm px-4 py-3 rounded-lg shadow-sm transition-all duration-200"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default OrderSummary;
