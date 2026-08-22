const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String }, // E.g. Painkiller, Antibiotic
  requiresPrescription: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);
