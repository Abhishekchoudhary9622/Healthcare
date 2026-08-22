require("dotenv").config();
const mongoose = require("mongoose");
const DoctorProfile = require("../src/models/DoctorProfile");
const Appointment = require("../src/models/Appointment");
const User = require("../src/models/User");
const PatientProfile = require("../src/models/PatientProfile");

async function updateDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    // 1. Update doctor fees to INR (₹500 - ₹1200)
    const doctors = await DoctorProfile.find();
    for (const doc of doctors) {
      if (!doc.consultationFee || doc.consultationFee < 300) {
        doc.consultationFee = 800;
      }
      await doc.save();
    }
    console.log(`Updated ${doctors.length} doctor profile fees to INR.`);

    // 2. Ensure patient profiles exist for patients
    const patientUsers = await User.find({ role: "PATIENT" });
    for (const pu of patientUsers) {
      let pp = await PatientProfile.findOne({ userId: pu._id });
      if (!pp) {
        pp = await PatientProfile.create({ userId: pu._id, gender: "Other", bloodGroup: "O+" });
        console.log(`Created PatientProfile for ${pu.email}`);
      }
    }

    // 3. Fix any existing appointments
    const appointments = await Appointment.find();
    console.log(`Found ${appointments.length} appointments in database.`);

    const firstDoc = await DoctorProfile.findOne();
    const firstPat = await PatientProfile.findOne();

    for (const apt of appointments) {
      let updated = false;
      if (!apt.doctorProfileId && firstDoc) {
        apt.doctorProfileId = firstDoc._id;
        updated = true;
      }
      if (!apt.patientProfileId && firstPat) {
        apt.patientProfileId = firstPat._id;
        updated = true;
      }
      if (updated) {
        await apt.save();
      }
    }

    console.log("Database update completed successfully!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Database update error:", err);
    process.exit(1);
  }
}

updateDb();
