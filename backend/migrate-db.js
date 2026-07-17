const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const LOCAL_URI = 'mongodb://127.0.0.1:27017/jcms_secure_auth';
const CLOUD_URI = 'mongodb+srv://jain_admin:JainPassword2026@cluster0.hefsmkd.mongodb.net/jcms?retryWrites=true&w=majority';

async function migrate() {
  let localClient, cloudClient;
  try {
    console.log('Connecting to local MongoDB (Native Driver)...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    console.log('Local MongoDB connected successfully!');

    console.log('Connecting to cloud MongoDB Atlas (Native Driver)...');
    cloudClient = new MongoClient(CLOUD_URI);
    await cloudClient.connect();
    console.log('Cloud MongoDB Atlas connected successfully!');

    // Read local database
    const localDb = localClient.db('jcms_secure_auth');
    
    // Atlas connection string database name (fallback to 'jcms' if not specified)
    const cloudDb = cloudClient.db('jcms');

    const collections = ['users', 'scans', 'manifests'];

    for (const collName of collections) {
      console.log(`\nMigrating collection: ${collName}...`);
      const localColl = localDb.collection(collName);
      const cloudColl = cloudDb.collection(collName);

      const docs = await localColl.find({}).toArray();
      console.log(`Found ${docs.length} documents in local collection: ${collName}.`);

      if (docs.length === 0) {
        console.log(`No documents found in ${collName}. Skipping...`);
        continue;
      }

      let insertedCount = 0;
      let duplicateCount = 0;

      for (const doc of docs) {
        // First check if a document with the same _id already exists in the cloud database
        const existsById = await cloudColl.findOne({ _id: doc._id });
        if (existsById) {
          duplicateCount++;
          continue;
        }

        // Secondary check to prevent unique constraint failures on custom fields like id or email
        if (collName === 'users' && doc.email) {
          const existsByEmail = await cloudColl.findOne({ email: doc.email });
          if (existsByEmail) {
            duplicateCount++;
            continue;
          }
        } else if (collName === 'scans' && doc.id) {
          const existsByScanId = await cloudColl.findOne({ id: doc.id });
          if (existsByScanId) {
            duplicateCount++;
            continue;
          }
        } else if (collName === 'manifests' && doc.id) {
          const existsByManifestId = await cloudColl.findOne({ id: doc.id });
          if (existsByManifestId) {
            duplicateCount++;
            continue;
          }
        }

        await cloudColl.insertOne(doc);
        insertedCount++;
      }

      console.log(`Completed: ${insertedCount} documents migrated. ${duplicateCount} duplicates skipped.`);
    }

    console.log('\n=== MIGRATION COMPLETE ===');
    console.log('All your local database manifests, scans, and users have been successfully copied to MongoDB Atlas cloud!');

  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    if (localClient) await localClient.close();
    if (cloudClient) await cloudClient.close();
    console.log('Connections closed.');
  }
}

migrate();
