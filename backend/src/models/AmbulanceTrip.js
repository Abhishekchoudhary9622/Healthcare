const mongoose = require('mongoose');

const ambulanceTripSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ambulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' }, // populated after driver accepts
  pickupLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String }
  },
  dropoffLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, default: 'Nearest Hospital' }
  },
  status: { 
    type: String, 
    enum: ['REQUESTED', 'ACCEPTED', 'ON_WAY', 'ARRIVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'], 
    default: 'REQUESTED' 
  },
  // for simulating driver progress
  distanceToPatient: { type: Number, default: 0 }, 
  etaMinutes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('AmbulanceTrip', ambulanceTripSchema);
