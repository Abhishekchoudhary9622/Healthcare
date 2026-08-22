require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function updateAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    const email = "choudharyabhishek656@gmail.com";
    const rawPassword = "Abhishek@09";
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    let admin = await User.findOne({ email });
    if (admin) {
      admin.firstName = "Abhishek";
      admin.lastName = "Choudhary";
      admin.password = hashedPassword;
      admin.role = "ADMIN";
      admin.isActive = true;
      await admin.save();
      console.log(`Updated existing user ${email} to ADMIN with new password.`);
    } else {
      admin = await User.create({
        email,
        password: hashedPassword,
        firstName: "Abhishek",
        lastName: "Choudhary",
        role: "ADMIN",
        isActive: true
      });
      console.log(`Created new ADMIN user: ${email}`);
    }

    // Also update any old placeholder admin if exists
    const oldAdmin = await User.findOne({ email: "admin@healthsync.com" });
    if (oldAdmin) {
      oldAdmin.isActive = false;
      await oldAdmin.save();
      console.log("Deactivated legacy admin@healthsync.com account");
    }

    console.log("\n✅ Admin credentials successfully updated!");
    console.log(`Name:     Abhishek Choudhary`);
    console.log(`Email:    ${email}`);
    console.log(`Role:     ADMIN`);
    console.log(`Password: ${rawPassword}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error updating admin:", error);
    process.exit(1);
  }
}

updateAdmin();
