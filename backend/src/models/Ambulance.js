const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['BASIC', 'ICU'], default: 'BASIC' },
  isAvailable: { type: Boolean, default: true },
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
