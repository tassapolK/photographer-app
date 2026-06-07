import { getDb } from '../../../_db.js';
import { setCors } from '../../../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  const db = await getDb();
  const event = await db.collection('events').findOne({ slug });
  if (!event) return res.status(404).json({ error: 'Not found' });

  const { descriptor } = req.body;
  const photos = await db.collection('photos').find({ event: event._id, hasFaces: true }).toArray();

  let matchedIds = [];
  if (descriptor && descriptor.length > 0) {
    matchedIds = photos.filter(p => {
      if (!p.faceDescriptors?.length) return false;
      return p.faceDescriptors.some(fd => {
        const dist = Math.sqrt(fd.reduce((sum, v, i) => sum + Math.pow(v - descriptor[i], 2), 0));
        return dist < 0.6;
      });
    }).map(p => p._id.toString());
  } else {
    matchedIds = photos.map(p => p._id.toString());
  }

  res.json({ matchedIds });
}
