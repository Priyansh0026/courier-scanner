const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jcms_secure_auth';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    console.log('Connected!');
    
    const manifestCollection = mongoose.connection.collection('manifests');
    
    const indexes = await manifestCollection.indexes();
    console.log('Current indexes:', indexes);
    
    const hasIdIndex = indexes.some(idx => idx.name === 'id_1');
    if (hasIdIndex) {
      console.log('Dropping index id_1...');
      await manifestCollection.dropIndex('id_1');
      console.log('Dropped id_1 successfully!');
    } else {
      console.log('Index id_1 not found. Already dropped or never created.');
    }
  } catch (err) {
    console.error('Error during index drop:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected!');
  }
}

run();
