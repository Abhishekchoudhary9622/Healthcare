import { useState, useEffect, useCallback } from 'react';

export function useUserLocation() {
  const [location, setLocation] = useState(() => {
    try {
      const cached = localStorage.getItem('user_realtime_location');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'denied' | 'error'
  const [errorMsg, setErrorMsg] = useState(null);

  // Reverse geocoding helper using OpenStreetMap Nominatim
  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!res.ok) throw new Error('Geocoding request failed');
      const data = await res.json();
      
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Local Area';
      const state = addr.state || '';
      const country = addr.country || '';
      const countryCode = (addr.country_code || '').toUpperCase();
      
      const locData = {
        city,
        state,
        country,
        countryCode,
        display: countryCode ? `${city}, ${countryCode}` : `${city}, ${country}`,
        lat: Number(lat.toFixed(4)),
        lon: Number(lon.toFixed(4)),
        timestamp: Date.now(),
      };

      setLocation(locData);
      localStorage.setItem('user_realtime_location', JSON.stringify(locData));
      setStatus('success');
      setErrorMsg(null);
      return locData;
    } catch (err) {
      // Fallback with timezone detection
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const fallbackCity = tz.split('/')[1]?.replace(/_/g, ' ') || 'Nearby';
      const locData = {
        city: fallbackCity,
        state: '',
        country: tz.split('/')[0] || '',
        countryCode: '',
        display: `${fallbackCity} (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
        lat,
        lon,
        timestamp: Date.now(),
      };
      setLocation(locData);
      localStorage.setItem('user_realtime_location', JSON.stringify(locData));
      setStatus('success');
      return locData;
    }
  };

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('loading');
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await reverseGeocode(latitude, longitude);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setErrorMsg('Location permission denied.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus('error');
          setErrorMsg('Location information is unavailable.');
        } else if (err.code === err.TIMEOUT) {
          setStatus('error');
          setErrorMsg('Location request timed out.');
        } else {
          setStatus('error');
          setErrorMsg('An unknown error occurred while retrieving location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Check if browser already granted permission previously
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation();
        } else if (result.state === 'prompt' && !location) {
          setStatus('prompt');
        } else if (result.state === 'denied') {
          setStatus('denied');
        }
      }).catch(() => {
        // Fallback if permissions query fails
        if (!location) {
          setStatus('prompt');
        }
      });
    } else if (!location) {
      setStatus('prompt');
    }
  }, [requestLocation]);

  return {
    location,
    status,
    errorMsg,
    requestLocation,
  };
}
