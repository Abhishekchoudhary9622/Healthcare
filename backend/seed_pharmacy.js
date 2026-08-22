const mongoose = require('mongoose');
require('dotenv').config();
const Pharmacy = require('./src/models/Pharmacy');
const Medicine = require('./src/models/Medicine');
const Inventory = require('./src/models/Inventory');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Clear existing
    await Pharmacy.deleteMany({});
    await Medicine.deleteMany({});
    await Inventory.deleteMany({});

    // 1. Create Pharmacies
    const pharmacies = await Pharmacy.insertMany([
      {
        name: 'Apollo Pharmacy',
        address: '123 MG Road, Bengaluru',
        contactNumber: '9876543210',
        location: { latitude: 12.9716, longitude: 77.5946 },
        rating: 4.8
      },
      {
        name: 'MedPlus Store',
        address: '45 Koramangala, Bengaluru',
        contactNumber: '9876543211',
        location: { latitude: 12.9352, longitude: 77.6245 },
        rating: 4.5
      },
      {
        name: 'Wellness Pharmacy',
        address: 'Whitefield, Bengaluru',
        contactNumber: '9876543212',
        location: { latitude: 12.9698, longitude: 77.7499 },
        rating: 4.2
      }
    ]);

    // 2. Create Medicines
    const medicines = await Medicine.insertMany([
      { name: 'Paracetamol 500mg', category: 'Painkiller', description: 'Used to treat fever and mild pain' },
      { name: 'Amoxicillin 250mg', category: 'Antibiotic', requiresPrescription: true, description: 'Used to treat bacterial infections' },
      { name: 'Vitamin C 500mg', category: 'Supplement', description: 'Immunity booster' },
      { name: 'Cough Syrup 100ml', category: 'Cough & Cold', description: 'Dry cough reliever' }
    ]);

    // 3. Create Inventory
    const inventories = [];
    pharmacies.forEach(pharmacy => {
      medicines.forEach(medicine => {
        // Randomize stock and price
        const hasStock = Math.random() > 0.3; // 70% chance of having it
        if (hasStock) {
          inventories.push({
            pharmacyId: pharmacy._id,
            medicineId: medicine._id,
            price: Math.floor(Math.random() * 100) + 20,
            stockQuantity: Math.floor(Math.random() * 50) + 10,
            inStock: true
          });
        }
      });
    });

    await Inventory.insertMany(inventories);
    console.log(`Seeded ${pharmacies.length} pharmacies, ${medicines.length} medicines, and ${inventories.length} inventory items.`);
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
