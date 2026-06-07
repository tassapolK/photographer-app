import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let clientPromise;

if (!uri) throw new Error('MONGODB_URI not set');

const client = new MongoClient(uri);
clientPromise = client.connect();

export async function getDb() {
  const c = await clientPromise;
  return c.db('photographer-app');
}
