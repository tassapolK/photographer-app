import { getDb } from '../../../_db.js';
import { verifyToken, setCors } from '../../../_auth.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { slug } = req.query;
  const db = await getDb();
  const event = await db.collection('events').findOne({ slug, photographer: user.id });
  if (!event) return res.status(404).json({ error: 'Not found' });

  const uploadedPhotos = [];
  const photosData = req.body?.photos || [];

  if (photosData.length > 0) {
    for (const photoData of photosData.slice(0, 50)) {
      const photo = {
        _id: uuidv4(), event: event._id,
        url: photoData.url || photoData.data,
        thumbnailUrl: photoData.url || photoData.data,
        originalName: photoData.name || 'photo.jpg',
        width: photoData.width || 800, height: photoData.height || 600,
        faceDescriptors: photoData.faceDescriptors || [],
        hasFaces: (photoData.faceDescriptors || []).length > 0,
        createdAt: new Date()
      };
      await db.collection('photos').insertOne(photo);
      uploadedPhotos.push({ _id: photo._id, url: photo.url, thumbnailUrl: photo.thumbnailUrl });
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const seed = uuidv4().slice(0, 8);
      const photo = {
        _id: uuidv4(), event: event._id,
        url: `https://picsum.photos/seed/${seed}/800/600`,
        thumbnailUrl: `https://picsum.photos/seed/${seed}/400/300`,
        originalName: `photo_${i + 1}.jpg`,
        width: 800, height: 600, faceDescriptors: [], hasFaces: false, createdAt: new Date()
      };
      await db.collection('photos').insertOne(photo);
      uploadedPhotos.push({ _id: photo._id, url: photo.url, thumbnailUrl: photo.thumbnailUrl });
    }
  }

  await db.collection('events').updateOne({ _id: event._id }, {
    $inc: { photoCount: uploadedPhotos.length },
    $set: { coverPhoto: uploadedPhotos[0]?.thumbnailUrl || '' }
  });

  res.status(201).json(uploadedPhotos);
}
