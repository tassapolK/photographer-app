import { getDb } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { photoId } = req.query;
  const db = await getDb();
  const photo = await db.collection('photos').findOne({ _id: photoId });
  if (!photo) return res.status(404).json({ error: 'Not found' });

  const event = await db.collection('events').findOne({ _id: photo.event });
  if (!event || event.photographer !== user.id) return res.status(403).json({ error: 'Forbidden' });

  await db.collection('photos').deleteOne({ _id: photoId });
  await db.collection('events').updateOne({ _id: photo.event }, { $inc: { photoCount: -1 } });
  res.json({ message: 'Deleted' });
}
