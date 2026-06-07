import { getDb } from '../_db.js';
import { signToken, setCors } from '../_auth.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const db = await getDb();
    const existing = await db.collection('photographers').findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email exists' });

    const id = uuidv4();
    await db.collection('photographers').insertOne({ id, name, email, password, createdAt: new Date() });
    res.status(201).json({ token: signToken(id), name });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
