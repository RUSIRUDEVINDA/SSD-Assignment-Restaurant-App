
import React from "react";
import { format } from "date-fns";
import { Check, X, Calendar, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reservation, ReservationRequest } from "@/types";

interface AdminReservationRequestProps {
  request: ReservationRequest;
  reservation: Reservation;
  restaurantName: string;
  onStatusChange: (requestId: string, newStatus: 'approved' | 'rejected') => void;
}

const AdminReservationRequest: React.FC<AdminReservationRequestProps> = ({
  request,
  reservation,
  restaurantName,
  onStatusChange
}) => {
  const handleApprove = () => {
    onStatusChange(request.id, 'approved');
    toast.success(`Request has been approved`);
  };

  const handleReject = () => {
    onStatusChange(request.id, 'rejected');
    toast.success(`Request has been rejected`);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{request.type === 'modification' ? 'Modification Request' : 'Cancellation Request'}</CardTitle>
            <CardDescription>
              {restaurantName} • {format(new Date(request.createdAt), "MMM d, yyyy")}
            </CardDescription>
          </div>
          <Badge
            className={
              request.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : request.status === 'approved'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }
          >
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Original Reservation</p>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                {reservation.date}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                {reservation.time}
              </div>
            </div>
            
            {request.type === 'modification' && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Requested Changes</p>
                {request.newDate && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {request.newDate}
                  </div>
                )}
                {request.newTime && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {request.newTime}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <p className="text-sm font-medium">Customer Request</p>
            <div className="flex items-start mt-1 text-sm text-gray-500">
              <FileText className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
              <span>{request.requestDetails}</span>
            </div>
          </div>
          
          <div className="pt-2">
            <p className="text-sm font-medium">Customer Information</p>
            <p className="text-sm text-gray-500">
              {reservation.customerInfo.name} • {reservation.customerInfo.email} • {reservation.customerInfo.phone}
            </p>
          </div>
        </div>
      </CardContent>
      
      {request.status === 'pending' && (
        <CardFooter className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-600 hover:bg-red-50"
            onClick={handleReject}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-600 hover:bg-green-50"
            onClick={handleApprove}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default AdminReservationRequest;
