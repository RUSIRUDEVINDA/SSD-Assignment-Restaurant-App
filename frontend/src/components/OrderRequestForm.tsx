import React, { useState } from "react";
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import ConfirmDialog from "./ConfirmDialog";

interface OrderRequestFormProps {
  orderId: string;
  type: "modification" | "cancellation";
  onSuccess: () => void;
}

const OrderRequestForm: React.FC<OrderRequestFormProps> = ({ orderId, type, onSuccess }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Suitable dropdown reasons
  const modificationReasons = [
    "Change in pickup time",
    "Change in item quantity",
    "Remove an item",
    "Incorrect order details",
    "Other"
  ];
  const cancellationReasons = [
    "Change of plans",
    "Ordered by mistake",
    "Found a better offer",
    "Delay in preparation",
    "Personal reasons",
    "Other"
  ];

  const reasons = type === "modification" ? modificationReasons : cancellationReasons;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/restaurant/order-requests', {
        orderId,
        type,
        requestDetails: reason === "Other" ? otherReason : reason,
        userEmail: user?.email,
      });
      setLoading(false);
      setOpen(false);
      onSuccess();
    } catch (err) {
      setLoading(false);
      alert('Failed to submit request. Please try again.');
    }
  };

  return (
    <>
      <Button
        variant={type === "modification" ? "default" : "destructive"}
        onClick={() => setOpen(true)}
        className={type === "modification" ? "bg-aerox-blue hover:bg-aerox-blue/90 text-white" : "bg-red-500 hover:bg-red-600 text-white"}
        disabled={!user?.email}
      >
        {type === "modification" ? "Request Modification" : "Request Cancellation"}
      </Button>
      {!user?.email && (
        <div className="text-red-500 text-sm mt-2">You must be logged in to submit a request.</div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {type === "modification" ? "Request Order Modification" : "Request Order Cancellation"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "modification" && (
              <div className="text-xs text-red-600 font-medium mb-2">
                Note: You can only request a modification at least 30 minutes before the pickup time.
              </div>
            )}
            {type === "cancellation" && (
              <div className="text-xs text-red-600 font-medium mb-2">
                Note: You can only request a cancellation at least 30 minutes before the pickup time.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="reason">
                Reason for {type}
              </label>
              <select
                id="reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aerox-blue"
              >
                <option value="" disabled>Select a reason</option>
                {reasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {reason === "Other" && (
                <input
                  type="text"
                  value={otherReason}
                  onChange={e => setOtherReason(e.target.value)}
                  placeholder="Please specify your reason (required)"
                  className="w-full border rounded px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-aerox-blue"
                  maxLength={200}
                  required
                />
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !reason || (reason === "Other" && !otherReason.trim())} className={type === "modification" ? "bg-aerox-blue hover:bg-aerox-blue/90 text-white" : "bg-red-500 hover:bg-red-600 text-white"}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
        <ConfirmDialog
          open={confirmOpen}
          title={type === "modification" ? "Confirm Modification Request" : "Confirm Cancellation Request"}
          description={type === "modification"
            ? "Are you sure you want to request a modification for this order?"
            : "Are you sure you want to request a cancellation for this order?"}
          confirmText={type === "modification" ? "Yes, Modify" : "Yes, Cancel"}
          cancelText="No, Go Back"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
          loading={loading}
          successStyle={type === "modification"}
        />
      </Dialog>
    </>
  );
};

export default OrderRequestForm;
