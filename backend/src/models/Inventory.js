const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  price: { type: Number, required: true },
  stockQuantity: { type: Number, required: true, default: 0 },
  inStock: { type: Boolean, default: true }
}, { timestamps: true });

// A pharmacy can only have one inventory record per medicine
inventorySchema.index({ pharmacyId: 1, medicineId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
