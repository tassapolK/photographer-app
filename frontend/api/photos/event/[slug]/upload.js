const { getDb } = require('../../../_db');
const { verifyToken, setCors } = require('../../../_auth');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { slug } = req.query;
  const db = await getDb();
  const event = await db.collection('events').findOne({ slug, photographer: user.id });
  if (!event) return res.status(404).json({ error: 'Not found' });

  // Handle base64 photo data from request body
  const uploadedPhotos = [];
  const photosData = req.body?.photos || [];

  if (photosData.length > 0) {
    // Real photos uploaded as base64
    for (const photoData of photosData.slice(0, 50)) {
      const photo = {
        _id: uuidv4(),
        event: event._id,
        url: photoData.url || photoData.data,
        thumbnailUrl: photoData.url || photoData.data,
        originalName: photoData.name || 'photo.jpg',
        width: photoData.width || 800,
        height: photoData.height || 600,
        faceDescriptors: photoData.faceDescriptors || [],
        hasFaces: (photoData.faceDescriptors || []).length > 0,
        createdAt: new Date()
      };
      await db.collection('photos').insertOne(photo);
      uploadedPhotos.push({ _id: photo._id, url: photo.url, thumbnailUrl: photo.thumbnailUrl });
    }
  } else {
    // Demo mode: create placeholder photos
    for (let i = 0; i < 3; i++) {
      const photo = {
        _id: uuidv4(),
        event: event._id,
        url: `https://picsum.photos/seed/${uuidv4()}/800/600`,
        thumbnailUrl: `https://picsum.photos/seed/${uuidv4()}/400/300`,
        originalName: `photo_${i + 1}.jpg`,
        width: 800, height: 600,
        faceDescriptors: [],
        hasFaces: false,
        createdAt: new Date()
      };
      await db.collection('photos').insertOne(photo);
      uploadedPhotos.push({ _id: photo._id, url: photo.url, thumbnailUrl: photo.thumbnailUrl });
    }
  }

  // Update event photo count
  await db.collection('events').updateOne(
    { _id: event._id },
    { $inc: { photoCount: uploadedPhotos.length }, $set: { coverPhoto: uploadedPhotos[0]?.thumbnailUrl || '' } }
  );

  res.status(201).json(uploadedPhotos);
};
