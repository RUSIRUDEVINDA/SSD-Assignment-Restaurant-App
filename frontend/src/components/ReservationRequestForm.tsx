
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, addDays } from "date-fns";
import { Calendar, Clock, FileText, User, Store } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Reservation, Restaurant } from "@/types";
import { restaurants as restaurantsData } from "@/data/restaurants";

interface ReservationRequestFormProps {
  reservation: Reservation;
  type: "modification" | "cancellation";
  onSuccess: (data?: any) => void;
}

const requestFormSchema = z.object({
  requestReason: z.string().min(1, "Please select a reason"),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

const ReservationRequestForm: React.FC<ReservationRequestFormProps> = ({ 
  reservation, 
  type,
  onSuccess
}) => {
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Function to get the restaurant name from the reservation
  const getRestaurantName = (reservation: Reservation) => {
    // First try to use the stored restaurant name from the reservation
    if (reservation.restaurantName) {
      return reservation.restaurantName;
    }
    
    // If no restaurant name is stored, try to get it from our fetched restaurants
    const restaurantId = reservation.restaurantId;
    if (!restaurantId) return 'Unknown Restaurant';
    
    const restaurant = restaurantsData.find(r => r.id === restaurantId);
    if (restaurant) {
      return restaurant.name;
    }
    
    // Fallback for when no data is available
    return `Restaurant ${restaurantId}`;
  };
  
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      requestReason: "",
    },
  });
  
  const onSubmit = (data: RequestFormValues) => {
    // Create a copy of the data to avoid modifying the original object
    const formData = {
      requestDetails: `${type === 'modification' ? 'Modification' : 'Cancellation'} request: ${data.requestReason}`,
      reservationId: reservation.id || reservation._id,
      type: type
    };
    
    // Pass the form data to the parent component's success handler
    onSuccess(formData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <h4 className="font-medium mb-2">Reservation Details</h4>
          <div className="flex items-center mb-2 text-aerox-blue">
            <Store className="h-4 w-4 mr-2" />
            <span className="font-medium text-base">{getRestaurantName(reservation)}</span>
          </div>
          <p className="text-sm text-gray-600">Date: {reservation.date}</p>
          <p className="text-sm text-gray-600">Time: {reservation.time}</p>
          <p className="text-sm text-gray-600">Party Size: {reservation.partySize || (reservation.seats && reservation.seats.length) || 1} people</p>
        </div>
        
        <FormField
          control={form.control}
          name="requestReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <FileText className="h-4 w-4 mr-2" /> 
                {type === "modification" ? "Reason for modification" : "Reason for cancellation"}
              </FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                >
                  <option value="">Select a reason</option>
                  {type === "modification" ? (
                    <>
                      <option value="Change time">Change time</option>
                      <option value="Change date">Change date</option>
                      <option value="Change party size">Change party size</option>
                      <option value="Special request">Special request</option>
                      <option value="Other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="No longer available">No longer available</option>
                      <option value="Change of plans">Change of plans</option>
                      <option value="Made reservation elsewhere">Made reservation elsewhere</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => onSuccess()}>
            Cancel
          </Button>
          <Button type="submit" className="bg-aerox-blue hover:bg-aerox-blue/90 text-white">
            Submit Request
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ReservationRequestForm;
