const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const { authenticate } = require('../middleware/auth');

// Seed mock hospitals if collection is empty
const defaultHospitals = [
  {
    name: 'Manipal Hospital & Trauma Care',
    address: '98 HAL Old Airport Rd, Kodihalli, Bengaluru',
    city: 'Bengaluru',
    location: { latitude: 12.9592, longitude: 77.6534 },
    contactNumber: '+91 80 2502 4444',
    emergencyNumber: '+91 80 2502 3333',
    totalBeds: 600,
    availableBeds: 82,
    icuBedsTotal: 80,
    icuBedsAvailable: 14,
    ventilatorsAvailable: 9,
    rating: 4.9,
    traumaLevel: 'Level 1',
    emergencyServices: ['24/7 Cardiac Emergency', 'Trauma Resuscitation', 'Stroke Center', 'Burn Unit', 'Ambulance Helipad'],
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Emergency Medicine', 'Oncology'],
    is24x7: true
  },
  {
    name: 'Apollo Specialty Hospital',
    address: '154/11 Bannerghatta Main Rd, Bengaluru',
    city: 'Bengaluru',
    location: { latitude: 12.8954, longitude: 77.5986 },
    contactNumber: '+91 80 2630 4050',
    emergencyNumber: '+91 80 1066',
    totalBeds: 450,
    availableBeds: 54,
    icuBedsTotal: 65,
    icuBedsAvailable: 11,
    ventilatorsAvailable: 7,
    rating: 4.8,
    traumaLevel: 'Level 1',
    emergencyServices: ['Comprehensive Emergency Care', 'Pediatric ICU', 'Catheterization Lab', 'Organ Transplant'],
    specialties: ['Cardiology', 'Pulmonology', 'Nephrology', 'Critical Care'],
    is24x7: true
  },
  {
    name: 'Fortis Hospital Cunningham',
    address: '14 Cunningham Rd, Vasanth Nagar, Bengaluru',
    city: 'Bengaluru',
    location: { latitude: 12.9866, longitude: 77.5994 },
    contactNumber: '+91 80 4199 4444',
    emergencyNumber: '+91 80 1057 11',
    totalBeds: 300,
    availableBeds: 38,
    icuBedsTotal: 45,
    icuBedsAvailable: 8,
    ventilatorsAvailable: 4,
    rating: 4.7,
    traumaLevel: 'Level 2',
    emergencyServices: ['Rapid Emergency Response', 'Neonatal ICU', 'Acute Stroke Treatment'],
    specialties: ['Cardiac Care', 'Gastroenterology', 'General Surgery'],
    is24x7: true
  },
  {
    name: 'Aster CMI Hospital',
    address: 'No. 43/2, New Airport Rd, Sahakar Nagar, Bengaluru',
    city: 'Bengaluru',
    location: { latitude: 13.0601, longitude: 77.5925 },
    contactNumber: '+91 80 4344 0100',
    emergencyNumber: '+91 80 4344 0108',
    totalBeds: 500,
    availableBeds: 67,
    icuBedsTotal: 70,
    icuBedsAvailable: 16,
    ventilatorsAvailable: 10,
    rating: 4.8,
    traumaLevel: 'Level 1',
    emergencyServices: ['Polytrauma Center', 'Toxicology Unit', 'Advanced Life Support Ambulance'],
    specialties: ['Neurosciences', 'Robotic Surgery', 'Pediatrics', 'Liver Care'],
    is24x7: true
  },
  {
    name: 'Narayana Multispeciality Hospital',
    address: 'HSR Layout Sector 3, Bengaluru',
    city: 'Bengaluru',
    location: { latitude: 12.9116, longitude: 77.6389 },
    contactNumber: '+91 80 7122 2222',
    emergencyNumber: '+91 80 7122 2200',
    totalBeds: 250,
    availableBeds: 41,
    icuBedsTotal: 35,
    icuBedsAvailable: 7,
    ventilatorsAvailable: 4,
    rating: 4.6,
    traumaLevel: 'Level 2',
    emergencyServices: ['24/7 Casualty & Triage', 'Dialysis Emergency', 'Blood Bank'],
    specialties: ['General Medicine', 'Cardiology', 'Dermatology', 'Urology'],
    is24x7: true
  }
];

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// GET /api/hospitals/nearby - Search nearby hospitals with distance calculation
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 12.9716;
    const lng = parseFloat(req.query.lng) || 77.5946;
    const specialty = req.query.specialty;
    const emergencyOnly = req.query.emergency === 'true';

    let count = await Hospital.countDocuments();
    if (count === 0) {
      await Hospital.insertMany(defaultHospitals);
    }

    let query = {};
    if (specialty) {
      query.specialties = { $regex: specialty, $options: 'i' };
    }
    if (emergencyOnly) {
      query.icuBedsAvailable = { $gt: 0 };
    }

    let hospitals = await Hospital.find(query).lean();

    // Map distance and ETA
    const mapped = hospitals.map(h => {
      const distance = calculateDistance(lat, lng, h.location.latitude, h.location.longitude);
      const etaMinutes = Math.max(3, Math.round(distance * 3.5));
      return {
        ...h,
        distanceKm: distance,
        etaMinutes
      };
    });

    // Sort by distance
    mapped.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hospitals/:id - Get single hospital details
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
