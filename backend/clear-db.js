const mongoose = require('mongoose');
require('dotenv').config();

const Scan = require('./models/Scan');
const User = require('./models/User');
const OTPVerification = require('./models/OTPVerification');

const clearDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jcms_secure_auth');
    console.log(`[JCMS DB Cleaner] Connected to MongoDB: ${conn.connection.host}`);

    // 1. Delete all scans
    const scanResult = await Scan.deleteMany({});
    console.log(`- Deleted all parcel scan records. (${scanResult.deletedCount} documents removed)`);

    // 2. Delete all users
    const userResult = await User.deleteMany({});
    console.log(`- Deleted all registered user accounts. (${userResult.deletedCount} documents removed)`);

    // 3. Delete all pending OTP verifications
    const otpResult = await OTPVerification.deleteMany({});
    console.log(`- Deleted all temporary OTP records. (${otpResult.deletedCount} documents removed)`);

    console.log('\n[JCMS DB Cleaner] MongoDB database wiped clean successfully!');
    
    // Close connection
    await mongoose.connection.close();
    console.log('[JCMS DB Cleaner] Connection closed safely.');
  } catch (err) {
    console.error('Error clearing MongoDB:', err.message);
  }
};

clearDatabase();
