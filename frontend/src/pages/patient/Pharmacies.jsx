import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { Search, MapPin, Package, Store, CheckCircle, Navigation } from 'lucide-react';
import api from '@/lib/api';

export default function Pharmacies() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [location, setLocation] = useState(null);

  // Get user location for sorting by distance
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch nearby pharmacies
  const { data: nearbyData, isLoading: nearbyLoading } = useQuery({
    queryKey: ['pharmacies-nearby', location],
    queryFn: async () => {
      let url = '/pharmacy/nearby';
      if (location) url += `?lat=${location.lat}&lng=${location.lng}`;
      const res = await api.get(url);
      return res.data.data;
    },
  });

  // Search medicines
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['pharmacy-search', debouncedSearch, location],
    queryFn: async () => {
      if (!debouncedSearch) return null;
      let url = `/pharmacy/search?query=${encodeURIComponent(debouncedSearch)}`;
      if (location) url += `&lat=${location.lat}&lng=${location.lng}`;
      const res = await api.get(url);
      return res.data.data.results;
    },
    enabled: !!debouncedSearch,
  });

  return (
    <DashboardLayout title="Pharmacy & Medicines">
      <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
        
        {/* Header & Search */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Store className="w-64 h-64" />
          </div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Find Medicines Nearby</h1>
            <p className="text-emerald-100 mb-8 max-w-xl">
              Search for any medicine to see real-time stock availability at medical stores near you.
            </p>
            
            <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-md max-w-2xl flex gap-2 border border-white/20 shadow-inner">
              <div className="flex-1 bg-white rounded-xl flex items-center px-4">
                <Search className="w-5 h-5 text-slate-400 mr-2" />
                <input 
                  type="text"
                  placeholder="Search for medicines (e.g. Paracetamol)..."
                  className="w-full bg-transparent border-none outline-none py-3 text-slate-800"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {debouncedSearch && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-500" /> 
              Search Results for "{debouncedSearch}"
            </h2>
            
            {searchLoading ? (
              <PageSpinner />
            ) : searchData?.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                No stores found with this medicine currently in stock.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchData?.map((store, idx) => (
                  <Card key={idx} className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none hover:ring-2 ring-emerald-500/20 transition-all overflow-hidden group">
                    <div className="h-1.5 w-full bg-emerald-500" />
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {store.pharmacy.name}
                          </h3>
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {store.pharmacy.address}
                          </p>
                        </div>
                        {store.distanceKm && (
                          <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
                            <Navigation className="w-3 h-3" />
                            {store.distanceKm.toFixed(1)} km
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Available Medicines</p>
                        {store.availableMedicines.map((med, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              <span className="font-medium text-slate-800 dark:text-slate-200">{med.medicine.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">${med.price}</span>
                              <span className="text-xs text-slate-500 block">{med.stockQuantity} in stock</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nearby Stores (Default View) */}
        {!debouncedSearch && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-500" /> 
              Nearby Medical Stores
            </h2>
            
            {nearbyLoading ? (
              <PageSpinner />
            ) : nearbyData?.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
                No stores found nearby.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {nearbyData?.map((store, idx) => (
                  <Card key={idx} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                        <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">{store.name}</h3>
                      <p className="text-sm text-slate-500 flex items-start gap-1 mb-3">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{store.address}</span>
                      </p>
                      
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500">Contact: {store.contactNumber}</span>
                        {store.distanceKm && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {store.distanceKm.toFixed(1)} km away
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
