import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, ArrowLeft, Calendar, Clock, User, Phone, Mail, MapPin, Store, Users } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Restaurant, Reservation } from '@/types';

interface LocationState {
  reservation: Reservation;
  restaurant: Restaurant;
}

const ReservationConfirmation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { reservation, restaurant } = location.state as LocationState;
  const confirmationRef = useRef<HTMLDivElement>(null);
  
  // Get the actual reservation ID from the database (either _id or id)
  const reservationId = reservation._id || reservation.id || '';
  // Use the full reservation ID for the confirmation number
  const confirmationNumber = `AX-${reservationId}`;
  
  // Format date for display
  const formattedDate = format(new Date(reservation.date), 'MMMM d, yyyy');
  
  const handleDownloadPDF = () => {
    if (confirmationRef.current) {
      html2canvas(confirmationRef.current, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const imgWidth = 210; // A4 width in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`AeroX_Reservation_${reservationId}.pdf`);
      });
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Button 
        variant="ghost" 
        className="mb-4 flex items-center gap-2"
        onClick={() => navigate('/profile')}
      >
        <ArrowLeft size={16} />
        Back to Profile
      </Button>
      
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="bg-aerox-blue/10 pb-4">
            <CardTitle className="text-center text-2xl font-bold">
              Reservation Confirmed
            </CardTitle>
          </CardHeader>
          
          <div ref={confirmationRef}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                  <p className="text-sm text-gray-500">{restaurant.terminal}, {restaurant.location.shopNumber}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Reservation ID</div>
                  <div className="text-lg font-bold text-aerox-blue">{reservationId}</div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              {/* Restaurant Details Section */}
              <div className="mb-6 bg-aerox-blue/5 p-4 rounded-md">
                <h4 className="font-medium mb-3 text-aerox-blue">Restaurant Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3">
                    <Store className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Restaurant</div>
                      <div className="text-gray-700">{restaurant.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Location</div>
                      <div className="text-gray-700">
                        {restaurant.terminal}, Shop {restaurant.location.shopNumber}
                      </div>
                    </div>
                  </div>
                  
                  {restaurant.contact && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">Restaurant Contact</div>
                        <div className="text-gray-700">{restaurant.contact.phone}</div>
                      </div>
                    </div>
                  )}
                  
                  {restaurant.hours && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">Opening Hours</div>
                        <div className="text-gray-700">
                          {restaurant.hours.open} - {restaurant.hours.close}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Reservation Details Section */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 text-aerox-blue">Reservation Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Date</div>
                      <div className="text-gray-700">{formattedDate}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Time</div>
                      <div className="text-gray-700">{reservation.time}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Party Size</div>
                      <div className="text-gray-700">
                        {reservation.partySize || (reservation.seats && reservation.seats.length) || 1} people
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              {/* Customer Information Section */}
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <h4 className="font-medium mb-2 text-aerox-blue">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Reserved For</div>
                      <div className="text-gray-700">
                        {reservation.customerName || reservation.customerInfo?.name || 'Guest'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Phone</div>
                      <div className="text-gray-700">
                        {reservation.customerPhone || reservation.customerInfo?.phone || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 md:col-span-2">
                    <Mail className="h-5 w-5 text-aerox-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-gray-700">
                        {reservation.customerEmail || reservation.customerInfo?.email || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-sm text-gray-500 bg-aerox-blue/5 p-4 rounded-md">
                <h4 className="font-medium mb-2 text-aerox-blue">Important Information</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Please arrive 10 minutes before your reservation time.</li>
                  <li>If you need to modify or cancel your reservation, please visit your profile page.</li>
                  <li>Your reservation will be held for 15 minutes after the scheduled time.</li>
                  <li>For parties larger than 6, please contact the restaurant directly.</li>
                </ul>
              </div>
            </CardContent>
          </div>
          
          <CardFooter className="flex justify-center pt-0 pb-6">
            <Button 
              onClick={handleDownloadPDF}
              className="bg-aerox-blue hover:bg-aerox-blue/90 text-white flex items-center gap-2"
            >
              <Download size={16} />
              Download PDF
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ReservationConfirmation;
