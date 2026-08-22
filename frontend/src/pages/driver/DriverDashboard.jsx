import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Navigation, MapPin, Phone, User, Siren, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function DriverDashboard() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  // To handle the demo flow, we keep local state for active trip
  const [activeTrip, setActiveTrip] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Poll for incoming requests only when enabled and no active trip
  const { data: requests = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['ambulance-requests'],
    queryFn: async () => {
      const { data } = await api.get('/ambulances/requests');
      return data?.data || [];
    },
    refetchInterval: autoRefresh && !activeTrip ? 5000 : false,
    enabled: !activeTrip && !!user
  });

  const acceptMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.put(`/ambulances/trip/${id}/accept`);
      return data.data;
    },
    onSuccess: (data) => {
      setActiveTrip(data);
      toast.success('Request accepted. Proceed to patient.');
      queryClient.invalidateQueries(['ambulance-requests']);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/ambulances/trip/${id}/status`, payload);
      return data.data;
    },
    onSuccess: (data) => {
      setActiveTrip(data);
      if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        setTimeout(() => setActiveTrip(null), 2000);
      }
    }
  });

  const handleStatusUpdate = (status, distance = null, eta = null) => {
    const payload = { status };
    if (distance !== null) payload.distanceToPatient = distance;
    if (eta !== null) payload.etaMinutes = eta;
    updateStatusMutation.mutate({ id: activeTrip._id, payload });
  };

  if (isLoading && !requests.length && !activeTrip) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><PageSpinner /></div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-brand-500/30">
      
      {/* Driver Header */}
      <header className="bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg shadow-black/50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Siren className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{user?.firstName} {user?.lastName}</h1>
              <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span> ONLINE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh requests"
              className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={() => setAutoRefresh(prev => !prev)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                autoRefresh
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Auto Refresh"
            >
              Auto: {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button onClick={logout} className="text-slate-400 hover:text-white text-sm bg-slate-800 px-3 py-1.5 rounded-lg">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 py-8">
        {!activeTrip ? (
          <div className="space-y-4">
            <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="h-24 w-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 relative shadow-inner">
                <MapPin className="h-10 w-10 text-slate-500" />
                {/* Radar sweep effect */}
                <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
              </div>
              <h2 className="text-xl font-medium text-slate-300">Searching for requests...</h2>
              <p className="text-slate-500 text-sm mt-1">Stay in your current zone</p>
            </div>

            {requests?.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider px-2">Incoming Requests</h3>
                {requests.map(req => (
                  <Card key={req._id} className="bg-slate-800 border-red-500/50 shadow-lg shadow-red-900/20 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex justify-between items-center">
                      <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-sm">
                        <Siren className="h-4 w-4 animate-pulse" /> Emergency
                      </div>
                      <span className="text-xs text-red-300/70">{new Date(req.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <CardContent className="p-5">
                      <div className="grid grid-cols-2 gap-4 mb-5">
                         <div>
                            <p className="text-slate-400 text-xs uppercase font-semibold">Patient</p>
                            <p className="font-bold text-white text-lg mt-0.5">{req.patient?.firstName} {req.patient?.lastName}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-slate-400 text-xs uppercase font-semibold">Distance</p>
                            <p className="font-bold text-white text-lg mt-0.5">2.4 km</p>
                         </div>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Reject</Button>
                        <Button 
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 font-bold tracking-wide"
                          loading={acceptMutation.isLoading}
                          onClick={() => acceptMutation.mutate(req._id)}
                        >
                          ACCEPT
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            {/* Active Trip UI */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl border border-indigo-500/30 p-1 shadow-2xl shadow-indigo-900/50">
               <div className="bg-indigo-500/20 text-indigo-200 text-xs font-bold uppercase tracking-widest text-center py-2 rounded-t-3xl flex justify-center items-center gap-2">
                 <Navigation className="h-3.5 w-3.5" /> Active Trip
               </div>
               
               {/* Map Mock */}
               <div className="h-48 bg-slate-950/50 m-2 rounded-2xl relative overflow-hidden border border-white/5 flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  {/* Route line */}
                  <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 border-t-2 border-l-2 border-dashed border-indigo-400/50 rounded-tl-full rounded-tr-3xl"></div>
                  
                  {/* Markers */}
                  <div className="absolute top-[20%] right-[20%] flex flex-col items-center animate-bounce">
                     <MapPin className="h-8 w-8 text-red-500 drop-shadow-md" />
                     <span className="bg-slate-900 text-xs px-2 py-0.5 rounded-full font-bold mt-1 border border-red-500/30">Patient</span>
                  </div>

                  <div className="absolute bottom-[20%] left-[20%] flex flex-col items-center">
                     <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50 z-10">
                       <Navigation className="h-5 w-5 text-indigo-600" />
                     </div>
                  </div>
               </div>

               <div className="p-5">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">Destination</p>
                      <h3 className="font-bold text-xl">{activeTrip.pickupLocation?.address || 'MG Road, Bengaluru'}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">ETA</p>
                      <h3 className="font-bold text-2xl text-emerald-400">{activeTrip.etaMinutes} min</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl mb-6 border border-slate-700/50">
                    <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-white">Rahul Sharma</p>
                      <p className="text-xs text-slate-400">+91 98765 43210</p>
                    </div>
                    <a href="tel:+919876543210" className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center hover:bg-emerald-500/30 transition-colors">
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {activeTrip.status === 'ACCEPTED' && (
                       <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 h-12 text-base font-bold" onClick={() => handleStatusUpdate('ON_WAY', 1.5, 4)}>
                         Start Navigation
                       </Button>
                    )}
                    {activeTrip.status === 'ON_WAY' && (
                       <>
                         <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 h-12 text-base font-bold" onClick={() => handleStatusUpdate('ON_WAY', 0.5, 1)}>
                           Update: Approaching (1 min)
                         </Button>
                         <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 h-12 text-base font-bold" onClick={() => handleStatusUpdate('ARRIVED', 0, 0)}>
                           Mark as Arrived
                         </Button>
                       </>
                    )}
                    {activeTrip.status === 'ARRIVED' && (
                       <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 h-12 text-base font-bold" onClick={() => handleStatusUpdate('COMPLETED')}>
                         Trip Completed
                       </Button>
                    )}
                    {(activeTrip.status === 'COMPLETED' || activeTrip.status === 'CANCELLED') && (
                       <div className="text-center py-3 bg-slate-800 rounded-xl font-bold text-emerald-400">
                         {activeTrip.status}
                       </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
