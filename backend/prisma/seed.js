require("dotenv").config();
const mongoose       = require("mongoose");
const bcrypt         = require("bcryptjs");
const User           = require("../src/models/User");
const DoctorProfile  = require("../src/models/DoctorProfile");
const PatientProfile = require("../src/models/PatientProfile");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Admin
  let admin = await User.findOne({ email: "choudharyabhishek656@gmail.com" });
  if (!admin) {
    admin = await User.create({
      email: "choudharyabhishek656@gmail.com",
      password: await bcrypt.hash("Abhishek@09", 12),
      firstName: "Abhishek",
      lastName: "Choudhary",
      role: "ADMIN"
    });
    console.log("Admin created: choudharyabhishek656@gmail.com");
  }

  // Doctors
  const doctors = [
    { email:"dr.williams@healthsync.com", firstName:"Emily",   lastName:"Williams", specialisation:"Cardiology",       experience:12 },
    { email:"dr.chen@healthsync.com",     firstName:"Michael", lastName:"Chen",     specialisation:"Neurology",        experience:8  },
    { email:"dr.patel@healthsync.com",    firstName:"Priya",   lastName:"Patel",    specialisation:"Dermatology",      experience:6  },
    { email:"dr.johnson@healthsync.com",  firstName:"Robert",  lastName:"Johnson",  specialisation:"Orthopedics",      experience:15 },
    { email:"dr.kumar@healthsync.com",    firstName:"Anita",   lastName:"Kumar",    specialisation:"Pediatrics",       experience:10 },
    { email:"dr.brown@healthsync.com",    firstName:"James",   lastName:"Brown",    specialisation:"General Practice", experience:5  },
  ];
  for (const d of doctors) {
    let user = await User.findOne({ email:d.email });
    if (!user) {
      user = await User.create({ email:d.email, password:await bcrypt.hash("Doctor@123",12), firstName:d.firstName, lastName:d.lastName, role:"DOCTOR" });
      await DoctorProfile.create({ userId:user._id, specialisation:d.specialisation, qualifications:"MBBS, MD "+d.specialisation, experience:d.experience, bio:"Dr. "+d.lastName+" is an experienced specialist with "+d.experience+" years of practice.", consultationFee:800, slotDuration:30, isVerified:true });
      console.log("Doctor created: "+d.email);
    }
  }

  // Patient
  let patient = await User.findOne({ email:"patient@healthsync.com" });
  if (!patient) {
    patient = await User.create({ email:"patient@healthsync.com", password:await bcrypt.hash("Patient@123",12), firstName:"John", lastName:"Doe", role:"PATIENT" });
    await PatientProfile.create({ userId:patient._id, gender:"Male", bloodGroup:"O+" });
    console.log("Patient created");
  }

  console.log("\nSeed complete!");
  console.log("Admin:   choudharyabhishek656@gmail.com / Abhishek@09");
  console.log("Doctor:  dr.williams@healthsync.com / Doctor@123");
  console.log("Patient: patient@healthsync.com / Patient@123");
  await mongoose.disconnect();
}
main().catch(e=>{ console.error(e); process.exit(1); });
