import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Calendar, Armchair, Clock, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Restaurant, Table, Seat } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import axios from "axios";

interface TableReservationProps {
  restaurant: Restaurant;
  tables: Table[];
}

// Create a schema for reservation form validation
const reservationFormSchema = z.object({
  restaurantName: z.string(), // Added restaurant name field
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name should only contain letters and spaces"),
  email: z.string()
    .email("Please enter a valid email address"),
  phone: z.string()
    .regex(/^\+94\d{9}$/, "Phone number must start with +94 and have 9 digits after it (e.g. +94771234567)"),
  customers: z.number().min(1, "At least 1 customer required").max(20, "Maximum 20 customers")
});

type ReservationFormValues = z.infer<typeof reservationFormSchema>;

const TableReservation: React.FC<TableReservationProps> = ({ restaurant, tables }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Helper to format phone number for autofill
  function formatSriLankanPhone(phone?: string) {
    if (!phone) return "+94";
    if (phone.startsWith("+94")) return phone;
    if (phone.startsWith("0") && phone.length === 10) return "+94" + phone.slice(1);
    return "+94";
  }

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      restaurantName: restaurant.name, // Auto-filled with restaurant name
      date: today,
      time: "12:00",
      name: user?.name || "",
      email: user?.email || "",
      phone: formatSriLankanPhone(user?.phone),
      customers: 1,
    },
  });
  
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  
  const handleTableSelect = (table: Table) => {
    if (selectedTable?.id === table.id) {
      setSelectedTable(null);
    } else {
      setSelectedTable(table);
    }
  };

  const onSubmit = async (formData: ReservationFormValues) => {
    if (!isAuthenticated) {
      toast.error("Please log in to make a reservation");
      navigate("/login");
      return;
    }

    if (!selectedTable) {
      toast.error("Please select a table");
      return;
    }

    try {
      const reservationPayload = {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        date: formData.date,
        time: formData.time,
        partySize: formData.customers,
        tableId: selectedTable.id,
        restaurantName: restaurant.name, // Include restaurant name in the payload
      };
      const response = await axios.post(
        `http://localhost:5000/api/restaurant/${restaurant.id}/reservations`,
        reservationPayload
      );
      toast.success("Reservation confirmed! Your confirmation is ready.");
      navigate("/reservation-confirmation", {
        state: {
          reservation: response.data,
          restaurant: restaurant,
        },
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to submit reservation. Please try again."
      );
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">Table Reservation</h3>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Restaurant Name - Read-only field */}
          <div className="mb-6">
            <FormField
              control={form.control}
              name="restaurantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-medium text-aerox-blue">
                    Restaurant
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="mt-1 bg-aerox-blue/5 font-medium text-aerox-blue"
                      readOnly
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" /> Reservation Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={today}
                      max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" /> Reservation Time
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <User className="h-4 w-4 mr-2" /> Full Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="mt-1"
                      placeholder="John Doe"
                      onKeyDown={(e) => {
                        // Allow only letters, spaces, and control keys
                        if (!/^[a-zA-Z\s]$/.test(e.key) && 
                            e.key !== 'Backspace' && 
                            e.key !== 'Delete' && 
                            e.key !== 'ArrowLeft' && 
                            e.key !== 'ArrowRight' && 
                            e.key !== 'Tab' && 
                            !e.ctrlKey) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" /> Email
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      className="mt-1"
                      placeholder="your@email.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" /> Phone Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="mt-1"
                      placeholder="+94771234567"
                      maxLength={12}
                      onChange={e => {
                        let value = e.target.value;
                        if (!value.startsWith("+94")) {
                          value = "+94" + value.replace(/^0+/, ""); // remove leading zeros if any
                        }
                        field.onChange(value);
                      }}
                      onKeyDown={e => {
                        // Allow only numbers, +, and control keys
                        if (!/^\d$/.test(e.key) && e.key !== '+' &&
                            e.key !== 'Backspace' && 
                            e.key !== 'Delete' && 
                            e.key !== 'ArrowLeft' && 
                            e.key !== 'ArrowRight' && 
                            e.key !== 'Tab' && 
                            !e.ctrlKey) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </FormControl>
                  {/* Show helper only if invalid and touched */}
                  {form.formState.touchedFields.phone && form.formState.errors.phone && (
                    <div className="text-xs text-gray-500 mt-1">
                      Phone number must start with +94 and have 9 digits (e.g., +94771234567)
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <User className="h-4 w-4 mr-2" /> No. of Customers
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      {...field}
                      value={field.value}
                      onChange={e => field.onChange(Number(e.target.value))}
                      placeholder="Enter number of customers"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Modern Table Selection UI with more tables */}
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3 flex items-center">
              <Armchair className="h-5 w-5 mr-2 text-aerox-blue" /> Select a Table
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...tables, {
                id: 'virtual-4',
                restaurantId: restaurant.id, // Add restaurantId to fix TypeScript error
                number: tables.length + 1,
                capacity: 4,
                seats: [
                  { id: 'v4-1', tableId: 'virtual-4', number: 1, isAvailable: true },
                  { id: 'v4-2', tableId: 'virtual-4', number: 2, isAvailable: true },
                  { id: 'v4-3', tableId: 'virtual-4', number: 3, isAvailable: true },
                  { id: 'v4-4', tableId: 'virtual-4', number: 4, isAvailable: true },
                ],
              }]
                .filter(table => table.capacity >= form.watch('customers'))
                .map(table => {
                  const allBooked = table.seats.every(seat => !seat.isAvailable);
                  return (
                    <div
                      key={table.id}
                      onClick={() => handleTableSelect(table)}
                      className={
                        `cursor-pointer rounded-xl shadow-md border transition-all duration-200 p-5 bg-white flex flex-col items-center relative
                        ${selectedTable?.id === table.id ? 'border-aerox-blue ring-2 ring-aerox-blue/50 bg-blue-50 scale-105' : 'border-gray-200 hover:border-aerox-blue/30 hover:shadow-lg'}
                        ${allBooked ? 'opacity-60 pointer-events-none' : ''}`
                      }
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-aerox-blue/10 mb-2">
                        <Armchair className="h-6 w-6 text-aerox-blue" />
                      </div>
                      <div className="font-semibold text-aerox-blue text-lg mb-1">Table {table.number}</div>
                      <div className="text-gray-500 text-sm mb-2">Capacity: {table.capacity} people</div>
                      <div className="flex gap-1 mb-2">
                        {table.seats.map(seat => (
                          <span key={seat.id} className={`inline-block w-2 h-2 rounded-full ${seat.isAvailable ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                        ))}
                      </div>
                      {allBooked && (
                        <span className="absolute top-2 right-2 bg-gray-400 text-white text-xs px-2 py-0.5 rounded-full shadow">Full</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-aerox-blue hover:bg-aerox-blue/90 text-white"
          >
            Confirm Reservation
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default TableReservation;
