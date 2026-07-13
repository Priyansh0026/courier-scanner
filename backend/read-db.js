const mongoose = require('mongoose');
require('dotenv').config();

const Scan = require('./models/Scan');
const User = require('./models/User');

const checkDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jcms_secure_auth');
    console.log(`[JCMS DB Inspector] Connected to MongoDB: ${conn.connection.host}\n`);

    // 1. Fetch Users
    const users = await User.find({});
    console.log('=== REGISTERED USERS ===');
    if (users.length === 0) {
      console.log('No users found in database.');
    } else {
      users.forEach(u => {
        console.log(`- Name: ${u.name} | Email: ${u.email} | Mobile: ${u.mobile} | Role: ${u.role}`);
      });
    }

    // 2. Fetch Scans
    const scans = await Scan.find({}).sort({ timestamp: -1 });
    console.log('\n=== PARCEL SCANS LOGS IN MONGODB ===');
    if (scans.length === 0) {
      console.log('No parcel scans logged in database yet.');
    } else {
      console.log(`Total Scans found: ${scans.length}\n`);
      scans.forEach((s, idx) => {
        console.log(`[${idx + 1}] Transaction ID: ${s.id}`);
        console.log(`    Tracking ID: ${s.trackingId}`);
        console.log(`    Courier Brand: ${s.courierId}`);
        console.log(`    Weight: ${s.weight} kg`);
        console.log(`    Notes: ${s.notes || 'None'}`);
        console.log(`    Scan Date/Time: ${new Date(s.timestamp).toLocaleString()}`);
        console.log(`    Operator ID: ${s.user}`);
        console.log('------------------------------------------------');
      });
    }

    // Close Connection
    await mongoose.connection.close();
    console.log('\n[JCMS DB Inspector] Connection closed safely.');
  } catch (err) {
    console.error('Error querying MongoDB:', err.message);
  }
};

checkDatabase();
