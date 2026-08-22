const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  contactNumber: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  operatingHours: { type: String, default: '24/7' },
  isOpen: { type: Boolean, default: true },
  rating: { type: Number, default: 4.5 }
}, { timestamps: true });

module.exports = mongoose.model('Pharmacy', pharmacySchema);
