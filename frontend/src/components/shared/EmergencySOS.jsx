import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Phone, MapPin, X, Navigation, HeartPulse, Siren, CheckCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
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

  // Fetch Ambulances (Simulate getting location then fetching)
  const { data: ambulances, isLoading: loadingAmbs } = useQuery({
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
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!activeTripId || !isOpen || status === 'COMPLETED' || status === 'CANCELLED') {
        return false;
      }
      return 3000;
    },
    enabled: !!activeTripId && isOpen
  });

  const bookAmbulance = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/ambulances/book', {
        latitude: location?.coords?.latitude || 12.9716,
        longitude: location?.coords?.longitude || 77.5946,
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
          toast.error('Location denied. Using default location.');
          setLocation({ coords: { latitude: 12.9716, longitude: 77.5946 } });
        }
      );
    } else {
      setLocation({ coords: { latitude: 12.9716, longitude: 77.5946 } });
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
      toast.error('Failed to trigger SOS. Please dial 911 / 108 immediately!');
    } finally {
      setIsLoadingSOS(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setTimeout(() => {
      setMode('MENU');
      setEmergencyData(null);
    }, 250);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className="w-full max-w-lg bg-[#121927] border border-red-500/30 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden transform animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Red Header matching Image 3 */}
        <div className="bg-[#dc2626] px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-white h-6 w-6 animate-pulse shrink-0" />
            <h2 className="text-lg font-bold text-white tracking-wider uppercase">
              EMERGENCY SERVICES
            </h2>
          </div>
          <button
            onClick={closeModal}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-0 text-white">
          {/* MENU MODE */}
          {mode === 'MENU' && (
            <div className="p-6 sm:p-8 text-center space-y-6">
              <h3 className="text-xl font-bold text-white tracking-tight">
                What type of help do you need?
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {/* Medical SOS Card matching Image 3 */}
                <button
                  type="button"
                  onClick={() => setMode('SOS')}
                  className="w-full p-5 rounded-2xl bg-[#1c141e] hover:bg-[#251527] border border-red-900/50 hover:border-red-500/80 flex items-center gap-5 text-left transition-all duration-200 group shadow-lg"
                >
                  <HeartPulse className="h-8 w-8 text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-red-500 group-hover:text-red-400 transition-colors">
                      Medical SOS
                    </p>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5">
                      Alert contacts & find nearest hospital
                    </p>
                  </div>
                </button>

                {/* Book Ambulance Card matching Image 3 */}
                <button
                  type="button"
                  onClick={() => setMode('AMBULANCE')}
                  className="w-full p-5 rounded-2xl bg-[#0f1b32] hover:bg-[#132342] border border-blue-900/50 hover:border-blue-500/80 flex items-center gap-5 text-left transition-all duration-200 group shadow-lg"
                >
                  <Siren className="h-8 w-8 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-blue-400 group-hover:text-blue-300 transition-colors">
                      Book Ambulance
                    </p>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5">
                      Live location tracking & dispatch
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* SOS CONFIRMATION / ACTIVE MODE */}
          {mode === 'SOS' && (
            <div className="p-6 sm:p-8">
              {!emergencyData ? (
                <div className="text-center py-2">
                  <div className="mx-auto bg-red-500/10 border border-red-500/20 text-red-500 h-20 w-20 flex items-center justify-center rounded-full mb-5 shadow-lg shadow-red-950/50">
                    <HeartPulse className="h-10 w-10 animate-bounce" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Are you experiencing an emergency?
                  </h3>
                  <p className="text-slate-300 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                    This will alert your emergency contacts and find the nearest hospital for immediate dispatch.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => setMode('MENU')}
                      className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium border border-slate-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerSOS}
                      disabled={isLoadingSOS}
                      className="px-8 py-2.5 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white font-bold tracking-wider shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoadingSOS ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>ACTIVATING...</span>
                        </>
                      ) : (
                        <span>ACTIVATE SOS</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex items-start gap-3">
                    <div className="bg-emerald-500/20 rounded-full p-2 text-emerald-400 mt-0.5">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-300">SOS Activated</h4>
                      <p className="text-sm text-emerald-200/80 mt-0.5">{emergencyData.message}</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-5 w-5 text-indigo-400" />
                      <h4 className="font-semibold text-white">Nearest Hospital</h4>
                    </div>
                    <p className="font-bold text-white text-lg">
                      {emergencyData.nearestHospital?.name || 'City General Hospital'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-300">
                      <span className="flex items-center gap-1">
                        <Navigation className="h-3.5 w-3.5 text-blue-400" />{' '}
                        {emergencyData.nearestHospital?.distance || '1.2 km'}
                      </span>
                      <span className="flex items-center gap-1 text-orange-400 font-semibold">
                        {emergencyData.nearestHospital?.eta || '8 mins'} ETA
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMode('AMBULANCE')}
                      className="w-full mt-5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/30"
                    >
                      <Siren className="h-4 w-4" /> Book Ambulance to this Hospital
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AMBULANCE BOOKING MODE */}
          {mode === 'AMBULANCE' && (
            <div className="p-0 bg-[#121927] h-full flex flex-col">
              {/* Mock Map / Radar for Location */}
              <div className="h-32 bg-slate-900 border-b border-slate-800 relative overflow-hidden flex items-center justify-center">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'radial-gradient(circle at center, #6366f1 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                ></div>
                {!location ? (
                  <div className="flex flex-col items-center text-indigo-400">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <span className="text-sm font-semibold">Finding your location...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <MapPin className="h-8 w-8 text-red-500 animate-bounce" />
                    <span className="bg-slate-800 text-xs px-3 py-1 rounded-full shadow-md mt-2 font-bold text-slate-200 border border-slate-700">
                      Current Location (Found)
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Siren className="h-5 w-5 text-blue-400" /> Available Ambulances
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMode('MENU')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Back to Menu
                  </button>
                </div>

                {loadingAmbs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {ambulances?.length ? (
                      ambulances.map((amb) => (
                        <div
                          key={amb._id}
                          className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-center justify-between shadow-sm"
                        >
                          <div>
                            <h4 className="font-bold text-white text-base">
                              Ambulance {amb.vehicleNumber?.slice(-4) || '108'}
                            </h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                              <Navigation className="h-3.5 w-3.5 text-blue-400" /> {amb.distance} km away
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="bg-blue-500/20 text-blue-300 text-[11px] px-2 py-0.5 rounded-md font-semibold border border-blue-500/30">
                                {amb.type || 'ICU'} Equipped
                              </span>
                              <span className="bg-orange-500/20 text-orange-300 text-[11px] px-2 py-0.5 rounded-md font-semibold border border-orange-500/30">
                                {amb.eta || '10'} min ETA
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => bookAmbulance.mutate()}
                            disabled={bookAmbulance.isPending}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 disabled:opacity-50"
                          >
                            {bookAmbulance.isPending ? 'BOOKING...' : 'BOOK NOW'}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 bg-slate-800/40 rounded-xl border border-slate-700/50">
                        <Siren className="h-8 w-8 text-blue-400 mx-auto mb-2 opacity-60" />
                        <p className="text-sm text-slate-300 font-medium">Nearest Ambulances Ready</p>
                        <button
                          type="button"
                          onClick={() => bookAmbulance.mutate()}
                          disabled={bookAmbulance.isPending}
                          className="mt-3 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                        >
                          DISPATCH FIRST AVAILABLE
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TRACKING MODE */}
          {mode === 'TRACKING' && trip && (
            <div className="p-0 bg-slate-900 text-white flex flex-col h-full animate-in zoom-in-95 duration-300">
              <div className="h-56 bg-slate-950 relative overflow-hidden border-b border-slate-800 flex items-center justify-center">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      'linear-gradient(#1e293b 2px, transparent 2px), linear-gradient(90deg, #1e293b 2px, transparent 2px)',
                    backgroundSize: '40px 40px'
                  }}
                ></div>

                {trip.status !== 'ARRIVED' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="h-full w-full rounded-full border-[60px] border-emerald-500/5 animate-ping"
                      style={{ animationDuration: '3s' }}
                    ></div>
                  </div>
                )}

                <div className="absolute top-[20%] right-[20%] flex flex-col items-center z-20">
                  <MapPin className="h-8 w-8 text-red-500 drop-shadow-lg" fill="#ef4444" />
                  <span className="bg-slate-900 text-[10px] px-3 py-1 rounded-full font-bold mt-1 border border-red-500/50 shadow-lg text-red-400">
                    YOUR LOCATION
                  </span>
                </div>

                <div className="absolute left-[20%] bottom-[20%] h-4 w-4 rounded-full bg-blue-500/20 z-0 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                </div>

                {trip.status !== 'REQUESTED' && (
                  <div
                    className={`absolute left-[20%] bottom-[20%] flex flex-col items-center transition-all duration-[2000ms] ease-in-out z-30 ${
                      trip.status === 'ARRIVED'
                        ? 'translate-x-[220%] -translate-y-[220%]'
                        : trip.status === 'ON_WAY'
                        ? 'translate-x-[110%] -translate-y-[110%]'
                        : ''
                    }`}
                  >
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
                        <a
                          href={`tel:${trip.ambulance.driver.phone}`}
                          className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      </div>
                    )}

                    {(trip.status === 'ARRIVED' || trip.status === 'COMPLETED') && (
                      <button
                        type="button"
                        className="w-full mt-6 py-2.5 rounded-xl bg-slate-800 text-white font-semibold"
                        onClick={closeModal}
                      >
                        Close Map
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative h-10 w-10 flex items-center justify-center rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 transition-all shadow-sm group"
        title="Emergency SOS"
      >
        <div className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-ping opacity-40"></div>
        <AlertCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
      </button>

      {/* Render modal directly in document.body using React Portal so it's never cut off */}
      {typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null}
    </>
  );
}
