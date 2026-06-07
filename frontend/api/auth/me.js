import { getDb } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = await getDb();
    const photographer = await db.collection('photographers').findOne({ id: user.id }, { projection: { password: 0 } });
    if (!photographer) return res.status(404).json({ error: 'Not found' });
    res.json(photographer);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
