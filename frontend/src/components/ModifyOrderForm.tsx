import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import toast from 'react-hot-toast';
import { OrderData } from '@/types';
import { formatPickupTime } from '@/utils/date';

interface ModifyOrderFormProps {
  order: OrderData;
  onSuccess: () => void;
  requestApproved?: boolean;
}

const ModifyOrderForm: React.FC<ModifyOrderFormProps> = ({ order, onSuccess, requestApproved = false }) => {
  const [open, setOpen] = useState(false); // Don't auto-open, let user click the button first
  
  // Convert from dot format (20.00) to colon format (20:00) for HTML time input
  const dotToColonFormat = (time: string): string => {
    if (!time) return '';
    return time.replace('.', ':');
  };
  
  // Convert from colon format (20:00) to dot format (20.00) for display
  const colonToDotFormat = (time: string): string => {
    if (!time) return '';
    return time.replace(':', '.');
  };
  
  const [pickupTime, setPickupTime] = useState(dotToColonFormat(formatPickupTime(order.pickupTime)));
  const [itemsPurchased, setItemsPurchased] = useState(order.itemsPurchased.map(item => ({ ...item })));
  const [totalAmount, setTotalAmount] = useState(order.totalAmount);
  const [fullName, setFullName] = useState(order.fullName);
  const [email] = useState(order.email); // read-only
  const [phoneNumber, setPhoneNumber] = useState(order.phoneNumber);
  const [loading, setLoading] = useState(false);

  // Utility to check if modification/cancellation is allowed (at least 30 mins before pickup)
  function canModifyOrCancel(pickupTime: string) {
    if (!pickupTime) return true;
    
    // Create today's date with the pickup time
    const now = new Date();
    const today = new Date();
    
    // Parse the pickup time (format: HH:MM)
    const [hours, minutes] = pickupTime.split(':').map(Number);
    today.setHours(hours, minutes, 0, 0);
    
    // If the pickup time is earlier than current time, assume it's for tomorrow
    if (today < now) {
      today.setDate(today.getDate() + 1);
    }
    
    // Check if pickup time is at least 30 minutes from now
    return (today.getTime() - now.getTime()) > 30 * 60 * 1000;
  }

  // Update totalAmount when itemsPurchased changes
  useEffect(() => {
    const newTotal = itemsPurchased.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotalAmount(newTotal);
  }, [itemsPurchased]);

  const handleItemChange = (index: number, field: 'name' | 'quantity' | 'price', value: string | number) => {
    setItemsPurchased(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: field === 'name' ? value : Number(value) } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.patch(`http://localhost:5000/restaurant/orders/${order._id}`, {
        restaurantName: order.restaurantName, // not editable
        itemsPurchased,
        totalAmount,
        fullName,
        email,
        phoneNumber,
        pickupTime: colonToDotFormat(pickupTime), // Convert to dot format for storage
      });
      setLoading(false);
      setOpen(false);
      onSuccess();
      toast.success('Order modified successfully');
    } catch (err: any) {
      setLoading(false);
      toast.error(err.response?.data?.message || 'Failed to modify order');
    }
  };

  const alreadyModified = !!order.modifiedAt;
  const cannotModify = !requestApproved && !canModifyOrCancel(order.pickupTime);

  return (
    <>
      <Button
        variant="outline"
        className="bg-aerox-blue/10 text-aerox-blue font-semibold px-4 py-2 rounded-lg shadow"
        disabled={alreadyModified || cannotModify}
        onClick={() => {
          if (cannotModify) {
            window.alert("You can't modify the order now. Modifications are only allowed up to 30 minutes before pickup time.");
            return;
          }
          setOpen(true);
        }}
      >
        {alreadyModified ? 'Already Modified' : 
         cannotModify ? "Can't Modify Now" : 
         requestApproved ? 'Modify Order Now' : 'Modify Booking'}
      </Button>
      {!alreadyModified && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-2xl shadow-xl border border-aerox-blue/20 bg-white/95" aria-describedby="modify-order-desc">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-aerox-blue mb-2 flex items-center gap-2">
                <span className="inline-block bg-aerox-blue/10 p-2 rounded-full"><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                Modify Order
              </DialogTitle>
            </DialogHeader>
            <div id="modify-order-desc" className="sr-only">Edit your order details and pickup time. Fields marked as read-only cannot be changed.</div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-aerox-blue">Order ID</label>
                  <Input value={order._id} disabled readOnly className="bg-gray-100 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-aerox-blue">Restaurant</label>
                  <Input value={order.restaurantName} disabled readOnly className="bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-aerox-blue">Full Name</label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} required className="bg-white border-aerox-blue/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-aerox-blue">Email</label>
                  <Input value={email} disabled readOnly className="bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-aerox-blue">Phone Number</label>
                  <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required className="bg-white border-aerox-blue/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-aerox-blue">Pickup Time</label>
                  <Input 
                    type="time" 
                    value={pickupTime} 
                    onChange={e => setPickupTime(e.target.value)} 
                    required 
                    className="bg-white border-aerox-blue/20" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Will be displayed as: {colonToDotFormat(pickupTime)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-aerox-blue">Items Ordered</label>
                <div className="space-y-3">
                  {itemsPurchased.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-aerox-blue/5 rounded-lg p-3">
                      <Input
                        value={item.name}
                        className="w-32 bg-gray-100 font-semibold text-aerox-blue"
                        required
                        placeholder="Item Name"
                        disabled
                      />
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-20 bg-white border-aerox-blue/20"
                        min={1}
                        required
                      />
                      <span className="ml-2 text-gray-700 text-base font-medium">
                        = {item.price} x {item.quantity} = <span className="font-bold text-aerox-blue">{(item.price * item.quantity).toFixed(2)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-aerox-blue">Total Amount</label>
                <Input value={totalAmount} disabled readOnly className="bg-gray-100 text-xl font-bold text-aerox-blue" />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-aerox-blue/20">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-aerox-blue hover:bg-aerox-blue/90 text-white font-semibold px-8 py-2 rounded-lg shadow-md">
                  {loading ? "Submitting..." : "Submit Modification"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ModifyOrderForm;
