import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, X } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface OrderCancellationRequestProps {
  orderId: string;
  pickupTime: string; // Add pickupTime as a prop
}

const OrderCancellationRequest: React.FC<OrderCancellationRequestProps> = ({ orderId, pickupTime }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Utility to check if cancellation is allowed (at least 30 mins before pickup)
  function canModifyOrCancel(pickupTime: string) {
    if (!pickupTime) return true;
    const pickupDate = new Date(pickupTime);
    const now = new Date();
    return (pickupDate.getTime() - now.getTime()) > 30 * 60 * 1000;
  }

  const cannotCancel = !canModifyOrCancel(pickupTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    setSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
    }, 3000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="default"
          disabled={cannotCancel}
          onClick={e => {
            if (cannotCancel) {
              e.preventDefault();
              window.alert("You can't cancel the order now. Cancellations are only allowed up to 30 minutes before pickup time.");
              return;
            }
          }}
          className="px-4 py-2 flex items-center gap-2 text-sm bg-red-50 text-red-800 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
        >
          <X className="h-4 w-4 text-red-600" />
          {cannotCancel ? "Can't Cancel Now" : "Cancel"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <X className="h-6 w-6 text-red-600" />
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Request Order Cancellation
            </DialogTitle>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Cancel your existing order
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 bg-red-600 rounded-full block" />
              <div>
                <h3 className="text-sm font-medium text-gray-700">Order ID</h3>
                <p className="text-sm text-gray-900">#{orderId}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-gray-700">
              Reason for Cancellation
            </Label>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-3">
                Please provide a reason for canceling your order:
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-red-600 rounded-full block" />
                  Order placed by mistake
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-red-600 rounded-full block" />
                  Changed my mind
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-red-600 rounded-full block" />
                  Found a better deal
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-red-600 rounded-full block" />
                  Other reason
                </li>
              </ul>
            </div>

            <div className="mt-4">
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for canceling your order"
                required
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700 text-white px-6"
            >
              Submit Request
            </Button>
          </div>

          {success && (
            <div className="mt-6 p-4 bg-red-50 text-red-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6" />
                  <div>
                    <h3 className="font-medium">Cancellation Request Submitted</h3>
                    <p className="text-sm mt-1">Your request has been sent to the restaurant. They will review it shortly.</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setOpen(false)}
                  className="text-red-600 hover:text-red-700"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Cancellation Request"
        description="Are you sure you want to request a cancellation for this order?"
        confirmText="Yes, Cancel"
        cancelText="No, Go Back"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </Dialog>
  );
};

export default OrderCancellationRequest;
