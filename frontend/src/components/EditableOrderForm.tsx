import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Pencil, Sparkles, Star, Clock, Phone, Mail, MapPin, ShoppingBag, AlertTriangle, Receipt, CalendarClock, DollarSign, User } from "lucide-react";
import axios from 'axios';
import { toast } from "react-hot-toast";

interface EditableOrderFormProps {
  orderId: string;
  orderData: {
    restaurantName: string;
    itemsPurchased: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    fullName: string;
    email: string;
    phoneNumber: string;
    pickupTime: string;
    status?: string;
  };
  onOrderUpdated?: () => void;
}

const EditableOrderForm: React.FC<EditableOrderFormProps> = ({ orderId, orderData, onOrderUpdated }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(orderData);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  const getAvailableTimeSlots = () => {
    const slots: { value: string; label: string }[] = [];
    const now = new Date();
    const startHour = 8; // 8 AM
    const endHour = 22; // 10 PM

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
        const formattedTime = time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        slots.push({
          value: timeValue,
          label: formattedTime
        });
      }
    }
    return slots;
  };

  const [timeSlots, setTimeSlots] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const slots = getAvailableTimeSlots();
    setTimeSlots(slots);
    if (orderData) {
      setFormData(orderData);
      const pickupTime = new Date(orderData.pickupTime);
      const timeString = `${String(pickupTime.getHours()).padStart(2, '0')}:${String(pickupTime.getMinutes()).padStart(2, '0')}`;
      
      const closestSlot = slots.reduce((prev, curr) => {
        const prevTime = new Date(`2000-01-01T${prev.value}`);
        const currTime = new Date(`2000-01-01T${curr.value}`);
        const pickupTime = new Date(`2000-01-01T${timeString}`);
        const prevDiff = Math.abs(currTime.getTime() - pickupTime.getTime());
        const currDiff = Math.abs(prevTime.getTime() - pickupTime.getTime());
        return prevDiff < currDiff ? curr : prev;
      });
      
      setFormData(prev => ({ ...prev, pickupTime: closestSlot.value }));
    }
  }, [orderData]);

  useEffect(() => {
    if (success) {
      // Auto-close success dialog after 2 seconds
      const timer = setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (confirmUpdate && !loading) {
      // Auto-close confirm dialog after 5 seconds of inactivity
      const timer = setTimeout(() => {
        setConfirmUpdate(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmUpdate, loading]);

  const updateOrder = async () => {
    try {
      setLoading(true);
      const selectedSlot = timeSlots.find(slot => slot.value === formData.pickupTime);
      if (!selectedSlot) {
        throw new Error('Please select a valid time slot');
      }

      const response = await axios.patch(`http://localhost:5000/restaurant/orders/${orderId}`, {
        restaurantName: formData.restaurantName,
        itemsPurchased: formData.itemsPurchased,
        totalAmount: formData.itemsPurchased.reduce((sum, item) => sum + (item.quantity * item.price), 0),
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        pickupTime: selectedSlot.value
      });

      if (response.status === 200) {
        setSuccess(true);
        setSuccessMessage('Order updated successfully');
        setConfirmUpdate(false);
        
        // Auto-close the main dialog after a short delay
        setTimeout(() => {
          setOpen(false);
          onOrderUpdated?.();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || "Failed to update order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const confirmUpdateOrder = () => {
    setConfirmUpdate(true);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuantityChange = (index: number, value: string) => {
    const quantity = parseInt(value);
    if (!isNaN(quantity) && quantity >= 0) {
      const items = [...formData.itemsPurchased];
      items[index] = {
        ...items[index],
        quantity
      };
      
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      
      setFormData(prev => ({
        ...prev,
        itemsPurchased: items,
        totalAmount: parseFloat(totalAmount.toFixed(2))
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="default"
          className="px-4 py-2 flex items-center gap-2 text-sm bg-aerox-blue/5 hover:bg-aerox-blue/10 transition-all duration-200 border border-aerox-blue/20 text-aerox-blue hover:text-aerox-blue rounded-lg"
        >
          <Pencil className="h-4 w-4" />
          Modify Order
        </Button>
      </DialogTrigger>
      
      {/* Success Dialog */}
      <Dialog open={success} onOpenChange={setSuccess}>
        <DialogContent className="bg-white/95 backdrop-blur-sm">
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

      {/* Update Confirmation Dialog */}
      <Dialog open={confirmUpdate} onOpenChange={setConfirmUpdate}>
        <DialogContent className="bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-aerox-blue">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              Confirm Update
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to update this order? This will change your order details.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmUpdate(false)}
              className="border-aerox-blue/20 text-aerox-blue hover:bg-aerox-blue/5"
            >
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={updateOrder}
              disabled={loading}
              className="bg-aerox-blue hover:bg-aerox-blue/90 text-white"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white/95">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Pencil className="h-6 w-6 text-aerox-blue" />
            <DialogTitle className="text-xl font-semibold text-aerox-blue">
              Modify Your Order
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            Make changes to your order details and save them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Details */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-aerox-blue/10">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-2 w-2 bg-aerox-blue rounded-full block" />
              <div>
                <h3 className="text-sm font-medium text-aerox-blue">Order ID</h3>
                <p className="text-sm text-gray-700">#{orderId}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="restaurantName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-aerox-blue/70" />
                  Restaurant Name
                </Label>
                <Input
                  id="restaurantName"
                  value={formData.restaurantName}
                  onChange={(e) => handleInputChange('restaurantName', e.target.value)}
                  className="mt-1 text-sm bg-white border border-aerox-blue/20 rounded-lg shadow-sm focus:border-aerox-blue focus:ring-aerox-blue/30"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4 text-aerox-blue/70" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="mt-1 text-sm bg-white border border-aerox-blue/20 rounded-lg shadow-sm focus:border-aerox-blue focus:ring-aerox-blue/30"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-aerox-blue/70" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="mt-1 text-sm bg-white border border-aerox-blue/20 rounded-lg shadow-sm focus:border-aerox-blue focus:ring-aerox-blue/30"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-aerox-blue/70" />
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className="mt-1 text-sm bg-white border border-aerox-blue/20 rounded-lg shadow-sm focus:border-aerox-blue focus:ring-aerox-blue/30"
                />
              </div>

              <div>
                <Label htmlFor="pickupTime" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-aerox-blue/70" />
                  Pickup Time
                </Label>
                <select
                  id="pickupTime"
                  value={formData.pickupTime}
                  onChange={(e) => handleInputChange('pickupTime', e.target.value)}
                  className="mt-1 text-sm bg-white border border-aerox-blue/20 rounded-lg shadow-sm h-9 w-full focus:border-aerox-blue focus:ring-aerox-blue/30"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-aerox-blue/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-aerox-blue flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-aerox-blue/70" />
                Order Items
              </h3>
              <span className="text-xs text-gray-500">Adjust quantities as needed</span>
            </div>
            
            <div className="space-y-4">
              {formData.itemsPurchased.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-aerox-blue/5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-aerox-blue/70" />
                      <h4 className="text-sm font-medium text-gray-800">{item.name}</h4>
                    </div>
                    <p className="text-xs text-gray-500">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="w-24 flex items-center justify-center">
                    <Input
                      type="number"
                      id={`item-${index}`}
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      min={0}
                      className="w-full text-sm bg-white border border-aerox-blue/20 rounded-lg shadow-sm text-center focus:border-aerox-blue focus:ring-aerox-blue/30"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-aerox-blue/10">
              <span className="text-sm font-medium text-aerox-blue flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-aerox-blue/70" />
                Total Amount
              </span>
              <span className="text-sm font-bold text-aerox-blue">${formData.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-aerox-blue/10">
            <h3 className="text-sm font-medium text-aerox-blue flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-4 w-4 text-aerox-blue/70" />
              Instructions
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-aerox-blue rounded-full block" />
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-aerox-blue/70" />
                  Modify quantities of items
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-aerox-blue rounded-full block" />
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-aerox-blue/70" />
                  Total amount updates automatically
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-aerox-blue rounded-full block" />
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-aerox-blue/70" />
                  Changes will be reflected in your order history
                </span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm border border-aerox-blue/20 hover:border-aerox-blue/30 text-aerox-blue hover:bg-aerox-blue/5"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmUpdateOrder}
              className="px-4 py-2 bg-aerox-blue hover:bg-aerox-blue/90 text-white text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              Update Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditableOrderForm;
