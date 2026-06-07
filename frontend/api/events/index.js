import { getDb } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const db = await getDb();

  if (req.method === 'GET') {
    const events = await db.collection('events').find({ photographer: user.id }).sort({ createdAt: -1 }).toArray();
    return res.json(events);
  }

  if (req.method === 'POST') {
    const { title, description, date } = req.body;
    const event = { _id: uuidv4(), slug: uuidv4(), title, description, date, photographer: user.id, photoCount: 0, coverPhoto: '', createdAt: new Date() };
    await db.collection('events').insertOne(event);
    return res.status(201).json(event);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
