const mongoose = require('mongoose');
const User = require('../models/User');

// Register connection event listeners for production monitoring
mongoose.connection.on('connected', () => {
  console.log('[JCMS DB Status] MongoDB Connected');
});

mongoose.connection.on('disconnected', () => {
  console.warn('[JCMS DB Status] MongoDB Disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[JCMS DB Status] MongoDB Reconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('[JCMS DB Status] MongoDB Connection Error:', err);
});

const seedOwnerAccount = async () => {
  try {
    const ownerEmail = (process.env.OWNER_EMAIL || 'mansijain10503@gmail.com').toLowerCase();
    const ownerPassword = process.env.OWNER_PASSWORD || 'Jaincourier@123';
    const ownerMobile = process.env.OWNER_MOBILE || '9876543210';

    // Clear any other user accounts to lock the site to this single owner
    await User.deleteMany({ email: { $ne: ownerEmail } });

    const exists = await User.findOne({ email: ownerEmail });
    if (!exists) {
      console.log('[JCMS DB Seeding] No owner account found. Seeding default owner...');
      
      await User.create({
        name: 'Jain Courier Owner',
        email: ownerEmail,
        mobile: ownerMobile,
        password: ownerPassword,
        emailVerified: true,
        mobileVerified: true,
        role: 'owner',
        status: 'active'
      });
      console.log(`[JCMS DB Seeding] Default owner account created successfully!`);
      console.log(`[JCMS DB Seeding] Email: ${ownerEmail} | Password: ${ownerPassword}`);
    } else {
      // Force update password to match target configurations
      exists.password = ownerPassword;
      await exists.save();
      console.log(`[JCMS DB Seeding] Owner account active and synchronized: ${ownerEmail}`);
    }
  } catch (err) {
    console.error('[JCMS DB Seeding] Error seeding default owner account:', err.message);
  }
};

const initializeDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jcms_secure_auth');
    console.log(`[JCMS DB] MongoDB Connected: ${conn.connection.host}`);
    
    // Safely drop the old unique 'id_1' index from manifests collection if present
    try {
      const manifestCollection = mongoose.connection.collection('manifests');
      const indexes = await manifestCollection.indexes();
      if (indexes.some(idx => idx.name === 'id_1')) {
        console.log('[JCMS DB] Dropping old global unique index "id_1" from manifests...');
        await manifestCollection.dropIndex('id_1');
        console.log('[JCMS DB] Dropped "id_1" successfully!');
      }
    } catch (indexErr) {
      console.log('[JCMS DB] Manifest unique index drop warning:', indexErr.message);
    }

    // Seed default owner account if not exists
    await seedOwnerAccount();
  } catch (error) {
    console.error(`[JCMS DB Error]: ${error.message}`);
    throw error;
  }
};

module.exports = {
  initializeDatabase
};
