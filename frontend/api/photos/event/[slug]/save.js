import { getDb } from '../../../_db.js';
import { verifyToken, setCors } from '../../../_auth.js';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { slug } = req.query;
  const db = await getDb();
  const event = await db.collection('events').findOne({ slug, photographer: user.id });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // ── GET: Return a Cloudinary signed-upload token ──────────────────────────
  // Browser uses this signature to upload directly to Cloudinary.
  // Signed uploads prevent anyone outside this app from uploading to our account.
  if (req.method === 'GET') {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `photographer-app/${event._id}`;
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      process.env.CLOUDINARY_API_SECRET
    );
    return res.json({
      signature,
      timestamp,
      folder,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    });
  }

  // ── POST: Save uploaded photo metadata to MongoDB ─────────────────────────
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const photosData = req.body?.photos || [];
  if (!photosData.length) return res.status(400).json({ error: 'No photos' });

  const saved = [];
  for (const p of photosData) {
    if (!p.url) continue;
    const photo = {
      _id: uuidv4(),
      event: event._id,
      url: p.url,
      thumbnailUrl: p.thumbnailUrl || p.url,
      publicId: p.publicId || '',
      originalName: p.name || 'photo.jpg',
      width: p.width || 0,
      height: p.height || 0,
      faceDescriptors: p.faceDescriptors || [],
      hasFaces: (p.faceDescriptors || []).length > 0,
      createdAt: new Date(),
    };
    await db.collection('photos').insertOne(photo);
    saved.push({ _id: photo._id, url: photo.url, thumbnailUrl: photo.thumbnailUrl });
  }

  // Increment photoCount; set coverPhoto only if not already set
  const updateOp = { $inc: { photoCount: saved.length } };
  if (!event.coverPhoto && saved[0]?.thumbnailUrl) {
    updateOp.$set = { coverPhoto: saved[0].thumbnailUrl };
  }
  await db.collection('events').updateOne({ _id: event._id }, updateOp);

  res.status(201).json(saved);
}
