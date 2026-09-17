import React from "react";
import { Calendar, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface RequestProps {
  id: string;
  reservationId: string;
  restaurantName: string;
  customerName: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  onStatusChange: (requestId: string, status: 'approved' | 'rejected') => void;
  deletedReservation?: boolean;
}

const AdminCancellationRequest = ({
  id,
  reservationId,
  restaurantName,
  customerName,
  date,
  time,
  reason,
  status,
  onStatusChange,
  deletedReservation = false
}: RequestProps) => {
  const handleApprove = () => {
    onStatusChange(id, 'approved');
    toast.success("Cancellation request approved", {
      style: {
        background: "#10b981",
        color: "white",
        border: "none",
      },
      icon: "✅",
    });
  };

  const handleReject = () => {
    onStatusChange(id, 'rejected');
    toast.error("Cancellation request rejected", {
      style: {
        background: "#ef4444",
        color: "white",
        border: "none",
      },
      icon: "❌",
    });
  };

  return (
    <Card className="overflow-hidden border border-gray-100 shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">{restaurantName}</h3>
              <Badge 
                variant={
                  status === 'pending' 
                    ? 'outline'
                    : status === 'approved'
                    ? 'default'
                    : 'destructive'
                }
                className={
                  status === 'pending' 
                    ? 'border-yellow-500 text-yellow-600'
                    : status === 'approved'
                    ? 'bg-green-500'
                    : ''
                }
              >
                {status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected'}
              </Badge>
            </div>
            {deletedReservation && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-3 rounded mb-2 text-sm">
                Reservation record has been deleted. This request remains for historical tracking.
              </div>
            )}
            
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-700">{customerName}</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-700">{date}</span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-700">{time}</span>
              </div>
            </div>
            
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">{reason}</p>
            </div>
          </div>
          
          {status === 'pending' && (
            <div className="flex flex-col gap-2 md:justify-end mt-4 md:mt-0">
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white">
                Approve
              </Button>
              <Button onClick={handleReject} variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminCancellationRequest;
