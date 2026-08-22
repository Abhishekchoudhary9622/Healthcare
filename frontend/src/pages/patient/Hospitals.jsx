import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Building2, Navigation, Phone, ShieldAlert, Bed, Activity,
  Search, Star, CheckCircle, Clock, MapPin, Siren, HeartPulse
} from 'lucide-react';

export default function Hospitals() {
  const { toast } = useToast();
  const [location, setLocation] = useState(null);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  // Auto-detect user geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          setLocation({ lat: 12.9716, lng: 77.5946 }); // Default Bengaluru coordinates
        }
      );
    } else {
      setLocation({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ['hospitals-nearby', location, specialtyFilter, emergencyOnly],
    queryFn: async () => {
      let url = '/hospitals/nearby';
      const params = new URLSearchParams();
      if (location) {
        params.append('lat', location.lat);
        params.append('lng', location.lng);
      }
      if (specialtyFilter) params.append('specialty', specialtyFilter);
      if (emergencyOnly) params.append('emergency', 'true');

      const res = await api.get(`${url}?${params.toString()}`);
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 3
  });

  const filteredHospitals = hospitals.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Hospital Recommendations & Emergency">
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
        {/* Top Emergency Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-8 text-white shadow-xl shadow-red-500/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold uppercase tracking-wider mb-3">
                <Siren className="h-4 w-4 animate-pulse" /> Emergency Hospital Network
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold">Find Nearest Hospitals & Trauma Centers</h1>
              <p className="mt-2 text-white/90 text-sm max-w-xl">
                Real-time bed availability, ICU capacity, and 1-tap emergency dispatch for nearby accredited medical centers.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <a href="tel:112">
                <Button className="bg-white text-red-600 hover:bg-red-50 font-bold px-6 border-0 shadow-lg" icon={Phone}>
                  Call 112 / SOS
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search hospitals by name, area, or landmark..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="input-base text-xs font-semibold py-2 w-full sm:w-auto"
            >
              <option value="">All Specialties</option>
              <option value="Cardiology">Cardiology / Cardiac</option>
              <option value="Neurology">Neurology / Stroke</option>
              <option value="Orthopedics">Orthopedics / Trauma</option>
              <option value="Pediatrics">Pediatrics / NICU</option>
              <option value="Oncology">Oncology</option>
            </select>

            <button
              onClick={() => setEmergencyOnly(!emergencyOnly)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 whitespace-nowrap',
                emergencyOnly
                  ? 'bg-red-500/10 text-red-500 border-red-500/30'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--border)]'
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              ICU Available Only
            </button>
          </div>
        </div>

        {/* Hospitals Directory List */}
        {isLoading ? (
          <PageSpinner />
        ) : filteredHospitals.length === 0 ? (
          <Card className="p-12 text-center text-[var(--text-muted)]">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm">No matching hospitals found</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try expanding your search criteria or specialty filters.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHospitals.map((hospital) => (
              <Card key={hospital._id} className="overflow-hidden hover:shadow-xl transition-all border hover:border-brand-400 group">
                <div className="p-6 space-y-5">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {hospital.name}
                        </h3>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                        {hospital.address}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-bold px-2.5 py-1 rounded-full">
                        <Navigation className="h-3 w-3" />
                        {hospital.distanceKm} km ({hospital.etaMinutes} min)
                      </span>
                    </div>
                  </div>

                  {/* Bed Capacity Gauges */}
                  <div className="grid grid-cols-3 gap-3 bg-[var(--bg-tertiary)] p-3.5 rounded-2xl border border-[var(--border)] text-center">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Available Beds</p>
                      <p className="text-lg font-extrabold text-[var(--text-primary)] mt-0.5">
                        {hospital.availableBeds} <span className="text-xs font-normal text-[var(--text-muted)]">/ {hospital.totalBeds}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ICU Beds</p>
                      <p className="text-lg font-extrabold text-emerald-500 mt-0.5">
                        {hospital.icuBedsAvailable} <span className="text-xs font-normal text-[var(--text-muted)]">available</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Trauma Care</p>
                      <p className="text-xs font-bold text-red-500 mt-1.5">
                        {hospital.traumaLevel || 'Level 1'}
                      </p>
                    </div>
                  </div>

                  {/* Emergency Services Badges */}
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Emergency Facilities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {hospital.emergencyServices?.map((srv, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-medium border border-[var(--border)]">
                          {srv}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.location.latitude},${hospital.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="secondary" className="w-full text-xs font-bold" icon={Navigation}>
                        Get Directions
                      </Button>
                    </a>

                    <a href={`tel:${hospital.emergencyNumber || hospital.contactNumber}`} className="flex-1">
                      <Button className="w-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white" icon={Phone}>
                        Emergency Call
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
