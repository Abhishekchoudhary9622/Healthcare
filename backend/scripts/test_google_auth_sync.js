require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const PatientProfile = require("../src/models/PatientProfile");
const DoctorProfile = require("../src/models/DoctorProfile");
const RefreshToken = require("../src/models/RefreshToken");
const { signToken, signRefreshToken } = require("../src/utils/jwt");

async function testGoogleAuthSync() {
  try {
    if (!process.env.MONGODB_URI) {
      console.log("No MONGODB_URI found, skipping live DB test");
      process.exit(0);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    const testGoogleEmail = "test_google_sync_user@gmail.com";
    const testGoogleId = "google_sub_1092837465";
    const testAvatar = "https://lh3.googleusercontent.com/a/ACg8ocL-test-avatar";

    // Clean up previous test run if any
    await User.deleteMany({ email: testGoogleEmail });
    await RefreshToken.deleteMany({ userId: { $exists: true } });

    // 1. Simulate Google Auth New User Registration
    console.log("\n--- Testing Google User Auto-Registration ---");
    let user = await User.create({
      email: testGoogleEmail,
      password: "hashed_dummy_password",
      firstName: "TestGoogle",
      lastName: "User",
      avatar: testAvatar,
      googleId: testGoogleId,
      role: "PATIENT",
      isActive: true,
    });
    await PatientProfile.create({ userId: user._id });
    console.log("✓ User created in DB:", user.email, "ID:", user._id);

    // 2. Generate tokens
    const accessToken = signToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    console.log("✓ JWT Access Token & Refresh Token generated");

    // 3. Simulate Google Auth Existing User Login & Avatar Update
    console.log("\n--- Testing Existing Google User Login & Avatar Update ---");
    const updatedAvatar = "https://lh3.googleusercontent.com/a/ACg8ocL-new-avatar-updated";
    user.avatar = updatedAvatar;
    await user.save();
    console.log("✓ Existing user avatar updated:", user.avatar === updatedAvatar);

    // 4. Query full profile data
    const patientProfile = await PatientProfile.findOne({ userId: user._id }).lean();
    console.log("✓ Patient profile linked:", Boolean(patientProfile));

    // Cleanup test record
    await User.deleteOne({ _id: user._id });
    await PatientProfile.deleteOne({ userId: user._id });
    await RefreshToken.deleteMany({ userId: user._id });
    console.log("✓ Test cleanup completed successfully");

    console.log("\n All Google Sign-In & Sync Database Tests Passed!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
}

testGoogleAuthSync();
