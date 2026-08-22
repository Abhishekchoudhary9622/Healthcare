const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, default: 'Bengaluru' },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  contactNumber: { type: String, required: true },
  emergencyNumber: { type: String, required: true },
  totalBeds: { type: Number, default: 200 },
  availableBeds: { type: Number, default: 45 },
  icuBedsTotal: { type: Number, default: 30 },
  icuBedsAvailable: { type: Number, default: 8 },
  ventilatorsAvailable: { type: Number, default: 5 },
  rating: { type: Number, default: 4.8 },
  traumaLevel: { type: String, enum: ['Level 1', 'Level 2', 'Level 3'], default: 'Level 1' },
  emergencyServices: [{ type: String }],
  specialties: [{ type: String }],
  is24x7: { type: Boolean, default: true },
  imageUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);
