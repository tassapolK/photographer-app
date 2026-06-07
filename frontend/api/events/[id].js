import { getDb } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const db = await getDb();
  const event = await db.collection('events').findOne({ _id: id });
  if (!event || event.photographer !== user.id) return res.status(404).json({ error: 'Not found' });

  if (req.method === 'GET') return res.json(event);
  if (req.method === 'PUT') {
    await db.collection('events').updateOne({ _id: id }, { $set: req.body });
    return res.json({ ...event, ...req.body });
  }
  if (req.method === 'DELETE') {
    await db.collection('photos').deleteMany({ event: id });
    await db.collection('events').deleteOne({ _id: id });
    return res.json({ message: 'Deleted' });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
