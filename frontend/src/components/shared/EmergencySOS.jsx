import { useState, useEffect } from 'react';
import { AlertCircle, Phone, MapPin, X, Navigation, HeartPulse, Siren, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function EmergencySOS() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('MENU'); // MENU | SOS | AMBULANCE | TRACKING
  
  // SOS State
  const [isLoadingSOS, setIsLoadingSOS] = useState(false);
  const [emergencyData, setEmergencyData] = useState(null);
  
  // Ambulance State
  const [location, setLocation] = useState(null);
  const [activeTripId, setActiveTripId] = useState(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch Ambulances (Simulate getting location then fetching)
  const { data: ambulances, isLoading: loadingAmbs, refetch: fetchAmbulances } = useQuery({
    queryKey: ['nearby-ambulances', location],
    queryFn: async () => {
      const { data } = await api.get('/ambulances/nearby');
      return data.data;
    },
    enabled: mode === 'AMBULANCE' && !!location
  });

  // Track Active Trip
  const { data: trip } = useQuery({
    queryKey: ['ambulance-trip', activeTripId],
    queryFn: async () => {
      const { data } = await api.get(`/ambulances/trip/${activeTripId}`);
      return data.data;
    },
    refetchInterval: 2000, // Poll every 2 seconds for live updates
    enabled: !!activeTripId
  });

  const bookAmbulance = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/ambulances/book', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: 'Current Location'
      });
      return data.data;
    },
    onSuccess: (data) => {
      setActiveTripId(data._id);
      setMode('TRACKING');
      toast.success('Ambulance requested! Waiting for driver to accept.');
    }
  });

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(pos),
        () => {
          toast.error('Location denied. Using default address.');
          setLocation({ coords: { latitude: 12.9716, longitude: 77.5946 }}); // Mock Bengaluru
        }
      );
    } else {
      setLocation({ coords: { latitude: 12.9716, longitude: 77.5946 }});
    }
  };

  useEffect(() => {
    if (mode === 'AMBULANCE' && !location) {
      handleGetLocation();
    }
  }, [mode]);

  const handleTriggerSOS = async () => {
    setIsLoadingSOS(true);
    try {
      const res = await api.post('/emergency/sos', { latitude: 40.7128, longitude: -74.0060 });
      setEmergencyData(res.data);
      toast.success('SOS Activated! Help is on the way.');
    } catch (error) {
      toast.error('Failed to trigger SOS. Please dial 911 immediately!');
    } finally {
      setIsLoadingSOS(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setTimeout(() => {
      setMode('MENU');
      setEmergencyData(null);
    }, 300);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        title="Emergency SOS"
      >
        <div className="absolute inset-0 rounded-xl border-2 border-red-500 animate-ping opacity-50"></div>
        <AlertCircle className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900 border-red-500 shadow-2xl overflow-hidden shadow-red-900/20">
            
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-white h-6 w-6 animate-pulse" />
                <h2 className="text-xl font-bold text-white tracking-wider">EMERGENCY SERVICES</h2>
              </div>
              <button onClick={closeModal} className="text-white/80 hover:text-white transition-colors p-1">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <CardContent className="p-0">
              
              {/* MENU MODE */}
              {mode === 'MENU' && (
                <div className="p-8 text-center space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">What type of help do you need?</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <Button 
                      onClick={() => setMode('SOS')} 
                      className="h-20 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/50 justify-start px-6 gap-4"
                    >
                      <HeartPulse className="h-8 w-8 text-red-500" />
                      <div className="text-left">
                        <p className="font-bold text-lg">Medical SOS</p>
                        <p className="text-xs font-normal opacity-80">Alert contacts & find nearest hospital</p>
                      </div>
                    </Button>
                    <Button 
                      onClick={() => setMode('AMBULANCE')} 
                      className="h-20 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 justify-start px-6 gap-4"
                    >
                      <Siren className="h-8 w-8 text-blue-500" />
                      <div className="text-left">
                        <p className="font-bold text-lg">Book Ambulance</p>
                        <p className="text-xs font-normal opacity-80">Live location tracking & dispatch</p>
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {/* SOS MODE */}
              {mode === 'SOS' && (
                <div className="p-6">
                  {!emergencyData ? (
                    <div className="text-center py-4">
                      <div className="mx-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 h-20 w-20 flex items-center justify-center rounded-full mb-6">
                        <HeartPulse className="h-10 w-10 animate-bounce" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Are you experiencing an emergency?</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto">
                        This will alert your emergency contacts and find the nearest hospital for immediate dispatch.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button variant="secondary" onClick={() => setMode('MENU')} className="px-8">Back</Button>
                        <Button variant="danger" onClick={handleTriggerSOS} loading={isLoadingSOS} className="px-8 bg-red-600 hover:bg-red-700 text-white">ACTIVATE SOS</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                        <div className="bg-emerald-100 rounded-full p-2 text-emerald-600 mt-0.5"><AlertCircle className="h-5 w-5" /></div>
                        <div>
                          <h4 className="font-semibold text-emerald-800">SOS Activated</h4>
                          <p className="text-sm text-emerald-600">{emergencyData.message}</p>
                        </div>
                      </div>
                      {/* Similar hospital UI as before */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="h-5 w-5 text-indigo-500" />
                          <h4 className="font-semibold text-slate-900 dark:text-white">Nearest Hospital</h4>
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-200 text-lg">{emergencyData.nearestHospital.name}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><Navigation className="h-3.5 w-3.5"/> {emergencyData.nearestHospital.distance}</span>
                          <span className="flex items-center gap-1 text-orange-500 font-medium">{emergencyData.nearestHospital.eta} ETA</span>
                        </div>
                        <Button className="w-full mt-4 flex items-center justify-center gap-2" onClick={() => setMode('AMBULANCE')}>
                          <Siren className="h-4 w-4" /> Book Ambulance to this Hospital
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AMBULANCE BOOKING MODE */}
              {mode === 'AMBULANCE' && (
                <div className="p-0 bg-slate-50 dark:bg-slate-900 h-full flex flex-col">
                  {/* Mock Map Background for Location */}
                  <div className="h-32 bg-indigo-100 dark:bg-indigo-950 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    {!location ? (
                       <div className="flex flex-col items-center text-indigo-600 dark:text-indigo-400">
                         <Loader2 className="h-6 w-6 animate-spin mb-2" />
                         <span className="text-sm font-semibold">Finding your location...</span>
                       </div>
                    ) : (
                       <div className="flex flex-col items-center">
                         <MapPin className="h-8 w-8 text-red-600 animate-bounce" />
                         <span className="bg-white dark:bg-slate-900 text-xs px-3 py-1 rounded-full shadow-md mt-2 font-bold text-slate-800 dark:text-slate-200">Current Location (Found)</span>
                       </div>
                    )}
                  </div>

                  <div className="p-5 flex-1">
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                       <Siren className="h-5 w-5 text-blue-500" /> Available Ambulances
                     </h3>

                     {loadingAmbs ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
                     ) : (
                        <div className="space-y-3">
                          {ambulances?.map(amb => (
                             <div key={amb._id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between shadow-sm">
                               <div>
                                 <h4 className="font-bold text-slate-900 dark:text-white text-base">Ambulance {amb.vehicleNumber.slice(-4)}</h4>
                                 <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                                   <Navigation className="h-3.5 w-3.5" /> {amb.distance} km away
                                 </p>
                                 <div className="flex gap-2 mt-2">
                                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-0.5 rounded-md font-semibold">{amb.type} Equipped</span>
                                    <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs px-2 py-0.5 rounded-md font-semibold">{amb.eta} min ETA</span>
                                 </div>
                               </div>
                               <Button 
                                 onClick={() => bookAmbulance.mutate()} 
                                 loading={bookAmbulance.isLoading}
                                 className="bg-blue-600 hover:bg-blue-700 text-white"
                               >
                                 BOOK NOW
                               </Button>
                             </div>
                          ))}
                        </div>
                     )}
                  </div>
                </div>
              )}

              {/* TRACKING MODE */}
              {mode === 'TRACKING' && trip && (
                 <div className="p-0 bg-slate-900 text-white flex flex-col h-full animate-in zoom-in-95 duration-300">
                    {/* Simulated Live Tracking Radar Map */}
                    <div className="h-56 bg-slate-950 relative overflow-hidden border-b border-slate-800 flex items-center justify-center">
                        {/* Map Grid Background */}
                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(#1e293b 2px, transparent 2px), linear-gradient(90deg, #1e293b 2px, transparent 2px)', backgroundSize: '40px 40px' }}></div>
                        
                        {/* Radar Sweep / Map Pulse */}
                        {trip.status !== 'ARRIVED' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-full w-full rounded-full border-[60px] border-emerald-500/5 animate-ping" style={{ animationDuration: '3s' }}></div>
                          </div>
                        )}
                        
                        {/* Destination Pin (Patient) */}
                        <div className="absolute top-[20%] right-[20%] flex flex-col items-center z-20">
                          <MapPin className="h-8 w-8 text-red-500 drop-shadow-lg" fill="#ef4444" />
                          <span className="bg-slate-900 text-[10px] px-3 py-1 rounded-full font-bold mt-1 border border-red-500/50 shadow-lg text-red-400">YOUR LOCATION</span>
                        </div>

                        {/* Origin/Ambulance Start Point */}
                        <div className="absolute left-[20%] bottom-[20%] h-4 w-4 rounded-full bg-blue-500/20 z-0 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        </div>

                        {/* Live Moving Ambulance Pin */}
                        {trip.status !== 'REQUESTED' && (
                           <div className={`absolute left-[20%] bottom-[20%] flex flex-col items-center transition-all duration-[2000ms] ease-in-out z-30 ${trip.status === 'ARRIVED' ? 'translate-x-[220%] -translate-y-[220%]' : trip.status === 'ON_WAY' ? 'translate-x-[110%] -translate-y-[110%]' : ''}`}>
                             <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/40 relative">
                               <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></div>
                               <Siren className="h-6 w-6 text-blue-600" />
                             </div>
                             <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 shadow-lg flex items-center gap-1">
                               <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                               LIVE
                             </span>
                           </div>
                        )}
                        
                        {/* Connective Route Line (Dynamic Color based on status) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                           <path d="M 25 75 Q 50 50 75 25" fill="none" stroke={trip.status === 'ARRIVED' ? '#10b981' : '#3b82f6'} strokeWidth="2.5" strokeDasharray="4 4" className={trip.status !== 'ARRIVED' ? 'animate-[dash_1s_linear_infinite]' : ''} />
                        </svg>
                        <style>{`
                          @keyframes dash {
                            to { stroke-dashoffset: -8; }
                          }
                        `}</style>
                    </div>

                    <div className="p-6">
                       {trip.status === 'REQUESTED' ? (
                         <div className="text-center py-6">
                           <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
                           <h3 className="text-xl font-bold">Finding Nearest Driver...</h3>
                           <p className="text-slate-400 mt-2">Please hold on, sending your location.</p>
                         </div>
                       ) : (
                         <>
                           <div className="flex justify-between items-end mb-6">
                              <div>
                                <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">Status</p>
                                <h3 className="font-bold text-xl text-emerald-400 flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                                  {trip.status.replace('_', ' ')}
                                </h3>
                              </div>
                              <div className="text-right">
                                <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">ETA</p>
                                <h3 className="font-bold text-2xl">{trip.etaMinutes} min</h3>
                              </div>
                           </div>

                           {trip.ambulance?.driver && (
                              <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                                <div className="h-12 w-12 bg-slate-700 rounded-full flex items-center justify-center">
                                  <span className="font-bold">{trip.ambulance.driver.firstName[0]}</span>
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-sm">Driver: {trip.ambulance.driver.firstName}</p>
                                  <p className="text-xs text-slate-400">Vehicle: {trip.ambulance.vehicleNumber}</p>
                                </div>
                                <a href={`tel:${trip.ambulance.driver.phone}`} className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                                  <Phone className="h-4 w-4" />
                                </a>
                              </div>
                           )}

                           {(trip.status === 'ARRIVED' || trip.status === 'COMPLETED') && (
                              <Button className="w-full mt-6 bg-slate-800 text-white" onClick={closeModal}>Close Map</Button>
                           )}
                         </>
                       )}
                    </div>
                 </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
