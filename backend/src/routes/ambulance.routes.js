const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Ambulance = require('../models/Ambulance');
const AmbulanceTrip = require('../models/AmbulanceTrip');

// Get available ambulances (simulated nearby logic)
router.get('/nearby', authenticate, async (req, res) => {
  try {
    // For demo purposes, we will return some mock available ambulances
    // if the DB doesn't have any yet.
    let ambulances = await Ambulance.find({ isAvailable: true }).populate('driver', 'firstName lastName phone');
    
    if (ambulances.length === 0) {
      // Mock data for demo if DB is empty
      return res.json({
        success: true,
        data: [
          { _id: 'mock1', vehicleNumber: 'KA-01-AB-1234', type: 'ICU', isAvailable: true, driver: { firstName: 'Raj', lastName: 'Kumar', phone: '9876543210' }, distance: 1.2, eta: 4 },
          { _id: 'mock2', vehicleNumber: 'KA-05-XY-9876', type: 'BASIC', isAvailable: true, driver: { firstName: 'Abdul', lastName: 'Kadir', phone: '9876543211' }, distance: 2.4, eta: 8 }
        ]
      });
    }

    // Add mock distance/eta for actual DB records
    const mapped = ambulances.map((amb, index) => ({
      ...amb.toObject(),
      distance: (index + 1) * 1.5,
      eta: (index + 1) * 3
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Book an ambulance
router.post('/book', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    
    // Create trip request
    const trip = await AmbulanceTrip.create({
      patient: req.user.id,
      pickupLocation: { latitude, longitude, address }
    });

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Driver endpoints

// Get active requests (Driver)
router.get('/requests', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Find requests that are unassigned
    const trips = await AmbulanceTrip.find({ status: 'REQUESTED' }).populate('patient', 'firstName lastName phone');
    res.json({ success: true, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Accept a trip request (Driver)
router.put('/trip/:id/accept', authenticate, async (req, res) => {
  try {
    const trip = await AmbulanceTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    // Find the ambulance for this driver
    let ambulance = await Ambulance.findOne({ driver: req.user.id });
    if (!ambulance) {
      // Mock ambulance for testing if driver has none
      ambulance = await Ambulance.create({
        driver: req.user.id,
        vehicleNumber: 'TEST-' + Math.floor(Math.random()*1000),
        type: 'BASIC'
      });
    }

    trip.ambulance = ambulance._id;
    trip.status = 'ACCEPTED';
    trip.distanceToPatient = 2.0; // mock 2km away initially
    trip.etaMinutes = 5; // mock 5 mins ETA
    await trip.save();
    
    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update trip status (Driver)
router.put('/trip/:id/status', authenticate, async (req, res) => {
  try {
    const { status, distanceToPatient, etaMinutes } = req.body;
    const trip = await AmbulanceTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    if (status) trip.status = status;
    if (distanceToPatient !== undefined) trip.distanceToPatient = distanceToPatient;
    if (etaMinutes !== undefined) trip.etaMinutes = etaMinutes;

    await trip.save();
    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Poll trip status (Patient)
router.get('/trip/:id', authenticate, async (req, res) => {
  try {
    const trip = await AmbulanceTrip.findById(req.params.id)
      .populate('patient', 'firstName lastName phone')
      .populate({
        path: 'ambulance',
        populate: { path: 'driver', select: 'firstName lastName phone avatar' }
      });
      
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
