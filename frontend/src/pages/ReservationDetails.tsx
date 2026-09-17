import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, Users, User, Phone, Mail, ArrowLeft, Building, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reservation, Restaurant } from '@/types';
import { getReservationById } from '@/utils/api';
import { restaurants } from '@/data/restaurants';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const ReservationDetails = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReservationDetails = async () => {
      if (!reservationId) return;
      
      try {
        setLoading(true);
        const reservationData = await getReservationById(reservationId);
        setReservation(reservationData);
        
        // Find restaurant from local data
        if (reservationData.restaurantId) {
          const restaurantData = restaurants.find(r => r.id === reservationData.restaurantId);
          setRestaurant(restaurantData || null);
        }
      } catch (error) {
        console.error('Error fetching reservation details:', error);
        toast.error('Could not load reservation details');
      } finally {
        setLoading(false);
      }
    };

    fetchReservationDetails();
  }, [reservationId]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white/90 text-gray-800">
      <Header />
      
      <main className="flex-grow container mx-auto px-6 py-8">
        <Button 
          variant="ghost" 
          className="mb-6 text-aerox-blue hover:text-aerox-blue/80"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-aerox-blue/10">
          <h1 className="text-2xl font-semibold text-aerox-blue mb-6">Reservation Details</h1>
          
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-2/5" />
            </div>
          ) : reservation ? (
            <div className="space-y-6">
              {/* Reservation ID */}
              <div className="bg-aerox-blue/5 p-4 rounded-lg border border-aerox-blue/20">
                <p className="text-sm text-gray-600">Reservation ID</p>
                <p className="font-mono text-aerox-blue font-medium">{reservation.id || reservation._id}</p>
              </div>
              
              {/* Restaurant Info */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-aerox-blue flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Restaurant Information
                </h3>
                <div className="bg-white rounded-lg p-4 border border-aerox-blue/10">
                  <h4 className="font-medium text-aerox-blue text-lg">
                    {reservation.restaurantName || (restaurant ? restaurant.name : 'Unknown Restaurant')}
                  </h4>
                  {restaurant && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p className="flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1 text-aerox-blue/70" />
                        {restaurant.terminal}, Shop {restaurant.location.shopNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Reservation Details */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-aerox-blue flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Reservation Information
                </h3>
                <div className="bg-white rounded-lg p-4 border border-aerox-blue/10 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium text-gray-800">{formatDate(reservation.date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-medium text-gray-800">{reservation.time}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Party Size</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <Users className="h-4 w-4 mr-1 text-aerox-blue/70" />
                      {reservation.partySize || 1} {(reservation.partySize || 1) === 1 ? 'person' : 'people'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      reservation.status === 'confirmed' 
                        ? 'bg-aerox-blue/10 text-aerox-blue'
                        : reservation.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Customer Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-aerox-blue flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </h3>
                <div className="bg-white rounded-lg p-4 border border-aerox-blue/10 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-800">{reservation.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <Mail className="h-4 w-4 mr-1 text-aerox-blue/70" />
                      {reservation.customerEmail}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-800 flex items-center">
                      <Phone className="h-4 w-4 mr-1 text-aerox-blue/70" />
                      {reservation.customerPhone}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button 
                  variant="default"
                  className="bg-aerox-blue hover:bg-aerox-blue/90"
                  onClick={() => navigate('/profile')}
                >
                  View All Reservations
                </Button>
                {reservation.status === 'confirmed' && (
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => navigate(`/profile?action=cancel&reservationId=${reservation.id || reservation._id}`)}
                  >
                    Cancel Reservation
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Reservation not found</p>
              <Button 
                variant="default"
                className="bg-aerox-blue hover:bg-aerox-blue/90 mt-4"
                onClick={() => navigate('/profile')}
              >
                View All Reservations
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReservationDetails;
