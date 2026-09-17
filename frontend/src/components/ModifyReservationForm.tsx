import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, addDays } from "date-fns";
import { Calendar, Clock, FileText, User, Building } from "lucide-react";
import { toast } from "react-hot-toast";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Reservation } from "@/types";
import { restaurants } from "@/data/restaurants";

// Helper to get restaurant name from reservation object
const getRestaurantName = (reservation: Reservation) => {
  if (reservation.restaurantName) return reservation.restaurantName;
  if (reservation.restaurantId) {
    const restaurant = restaurants.find(r => r.id === reservation.restaurantId);
    if (restaurant) return restaurant.name;
  }
  return "Unknown Restaurant";
};

interface ModifyReservationFormProps {
  reservation: Reservation;
  onSuccess: (data?: any) => void;
}

const modifyFormSchema = z.object({
  newDate: z.string().min(1, "Please select a new date"),
  newTime: z.string().min(1, "Please select a new time"),
  newPartySize: z.string().min(1, "Please enter a new party size"),
});

type ModifyFormValues = z.infer<typeof modifyFormSchema>;

const ModifyReservationForm: React.FC<ModifyReservationFormProps> = ({ 
  reservation, 
  onSuccess
}) => {
  const today = format(new Date(), "yyyy-MM-dd");
  
  const form = useForm<ModifyFormValues>({
    resolver: zodResolver(modifyFormSchema),
    defaultValues: {
      newDate: reservation.date,
      newTime: reservation.time,
      newPartySize: reservation.partySize?.toString() || "1",
    },
  });
  
  const onSubmit = (data: ModifyFormValues) => {
    // Create a copy of the data to avoid modifying the original object
    const formData = {
      reservationId: reservation.id || reservation._id,
      newDate: data.newDate,
      newTime: data.newTime,
      newPartySize: parseInt(data.newPartySize),
    };
    
    console.log('Submitting modification form:', formData);
    
    // Pass the form data to the parent component's success handler
    onSuccess(formData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <h4 className="font-medium mb-2">Reservation Details</h4>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Restaurant:</span> {getRestaurantName(reservation)}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Reservation ID:</span> {reservation.id || reservation._id}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Current Date:</span> {reservation.date}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Current Time:</span> {reservation.time}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Current Party Size:</span> {reservation.partySize || 1} people
          </p>
        </div>
        
        {/* Non-editable fields */}
        <div className="space-y-4">
          <FormItem>
            <FormLabel className="flex items-center">
              <Building className="h-4 w-4 mr-2" /> Restaurant
            </FormLabel>
            <Input 
              value={getRestaurantName(reservation)} 
              disabled 
              className="bg-gray-100"
            />
          </FormItem>
          
          <FormItem>
            <FormLabel className="flex items-center">
              <FileText className="h-4 w-4 mr-2" /> Reservation ID
            </FormLabel>
            <Input 
              value={reservation.id || reservation._id} 
              disabled 
              className="bg-gray-100"
            />
          </FormItem>
        </div>
        
        {/* Editable fields */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="newDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" /> New Date
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    min={today}
                    max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="newTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" /> New Time
                </FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="newPartySize"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <User className="h-4 w-4 mr-2" /> New Party Size
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="20" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => onSuccess()}>
            Cancel
          </Button>
          <Button type="submit" className="bg-aerox-blue hover:bg-aerox-blue/90 text-white">
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ModifyReservationForm;
