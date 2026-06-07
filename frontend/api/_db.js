// MongoDB connection helper for Vercel serverless
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!uri) {
  throw new Error('MONGODB_URI environment variable not set');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

async function getDb() {
  const c = await clientPromise;
  return c.db('photographer-app');
}

module.exports = { getDb };
