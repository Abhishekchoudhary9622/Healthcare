const Pharmacy = require('../models/Pharmacy');
const Medicine = require('../models/Medicine');
const Inventory = require('../models/Inventory');
const { success, notFound, badRequest } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Distance calculation utility (Haversine formula)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; 
  return d;
}
function deg2rad(deg) { return deg * (Math.PI/180); }

const getNearbyPharmacies = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  const pharmacies = await Pharmacy.find({ isOpen: true }).lean();
  
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    // Sort by distance
    pharmacies.forEach(p => {
      p.distanceKm = getDistanceFromLatLonInKm(latNum, lngNum, p.location.latitude, p.location.longitude);
    });
    pharmacies.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return success(res, pharmacies);
});

const searchMedicines = asyncHandler(async (req, res) => {
  const { query, lat, lng } = req.query;
  if (!query) return badRequest(res, "Search query is required");

  // 1. Find matching medicines
  const medicines = await Medicine.find({ name: { $regex: query, $options: 'i' } }).lean();
  if (medicines.length === 0) return success(res, { results: [] });

  const medIds = medicines.map(m => m._id);

  // 2. Find inventory records for these medicines
  const inventory = await Inventory.find({ 
    medicineId: { $in: medIds },
    inStock: true,
    stockQuantity: { $gt: 0 }
  })
  .populate('pharmacyId')
  .populate('medicineId')
  .lean();

  // 3. Group by pharmacy and calculate distances if lat/lng provided
  const pharmacyMap = new Map();
  
  inventory.forEach(item => {
    const p = item.pharmacyId;
    if (!p.isOpen) return; // Skip closed pharmacies

    if (!pharmacyMap.has(p._id.toString())) {
      let dist = null;
      if (lat && lng) {
        dist = getDistanceFromLatLonInKm(parseFloat(lat), parseFloat(lng), p.location.latitude, p.location.longitude);
      }
      pharmacyMap.set(p._id.toString(), {
        pharmacy: p,
        distanceKm: dist,
        availableMedicines: []
      });
    }

    pharmacyMap.get(p._id.toString()).availableMedicines.push({
      medicine: item.medicineId,
      price: item.price,
      stockQuantity: item.stockQuantity
    });
  });

  const results = Array.from(pharmacyMap.values());
  
  if (lat && lng) {
    results.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return success(res, { results });
});

module.exports = {
  getNearbyPharmacies,
  searchMedicines
};
