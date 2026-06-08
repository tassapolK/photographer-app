import { getDb } from '../../../_db.js';
import { setCors } from '../../../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  const db = await getDb();
  const event = await db.collection('events').findOne({ slug });
  if (!event) return res.status(404).json({ error: 'Not found' });

  // ?all=true – return flat array for photographer admin view (no pagination)
  if (req.query.all === 'true') {
    const photos = await db.collection('photos')
      .find({ event: event._id })
      .sort({ createdAt: 1 })
      .toArray();
    return res.json(photos);
  }

  // ?ids=id1,id2,... – fetch specific photos by ID (face-match results)
  if (req.query.ids) {
    const ids = req.query.ids.split(',').filter(Boolean);
    const photos = await db.collection('photos')
      .find({ event: event._id, _id: { $in: ids } })
      .sort({ createdAt: 1 })
      .toArray();
    return res.json({ photos, total: photos.length, page: 1, hasMore: false });
  }

  // Paginated (default): ?page=1&limit=30
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
  const skip = (page - 1) * limit;

  const [photos, total] = await Promise.all([
    db.collection('photos')
      .find({ event: event._id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('photos').countDocuments({ event: event._id }),
  ]);

  res.json({ photos, total, page, limit, hasMore: skip + photos.length < total });
}
