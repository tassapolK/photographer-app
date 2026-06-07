const router = require('express').Router();
const Photo = require('../models/Photo');
const Event = require('../models/Event');
const requireAuth = require('../middleware/auth');
const { upload, cloudinary } = require('../middleware/upload');

// Public: get all photos for event (customer)
router.get('/event/:slug', async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const photos = await Photo.find({ event: event._id })
    .select('-faceDescriptors')
    .sort('createdAt');
  res.json(photos);
});

// Public: face match — customer sends a face descriptor, we return matching photo IDs
router.post('/event/:slug/face-match', async (req, res) => {
  const { descriptor } = req.body; // Float32Array serialized as plain array
  if (!descriptor || !Array.isArray(descriptor))
    return res.status(400).json({ error: 'Descriptor required' });

  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const photos = await Photo.find({ event: event._id, hasFaces: true });

  const THRESHOLD = 0.5;
  const matchedIds = [];

  for (const photo of photos) {
    for (const storedDesc of photo.faceDescriptors) {
      const distance = euclideanDistance(descriptor, storedDesc);
      if (distance < THRESHOLD) {
        matchedIds.push(photo._id.toString());
        break;
      }
    }
  }

  res.json({ matchedIds });
});

function euclideanDistance(a, b) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

// Protected: upload photos (photographer)
router.post('/event/:eventSlug/upload', requireAuth, upload.array('photos', 50), async (req, res) => {
  const event = await Event.findOne({ slug: req.params.eventSlug, photographer: req.photographerId });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const files = req.files;
  if (!files?.length) return res.status(400).json({ error: 'No files uploaded' });

  // Parse face descriptors sent from client-side face detection
  let faceData = {};
  try {
    faceData = JSON.parse(req.body.faceData || '{}');
  } catch { /* ignore */ }

  const photos = await Promise.all(files.map(async (file, i) => {
    const originalName = req.body[`name_${i}`] || file.originalname;
    const descriptors = faceData[i] || [];

    // Cloudinary already uploaded the file, file.path is the URL
    const thumbnailUrl = cloudinary.url(file.filename, {
      width: 400, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto',
    });

    return Photo.create({
      event: event._id,
      cloudinaryId: file.filename,
      url: file.path,
      thumbnailUrl,
      originalName,
      width: file.width || 0,
      height: file.height || 0,
      faceDescriptors: descriptors,
      hasFaces: descriptors.length > 0,
    });
  }));

  // Update event cover photo and count
  await Event.findByIdAndUpdate(event._id, {
    $inc: { photoCount: photos.length },
    ...(event.photoCount === 0 && { coverPhoto: photos[0].thumbnailUrl }),
  });

  res.status(201).json(photos.map(p => ({
    _id: p._id, url: p.url, thumbnailUrl: p.thumbnailUrl,
  })));
});

// Protected: delete photo
router.delete('/:photoId', requireAuth, async (req, res) => {
  const photo = await Photo.findById(req.params.photoId).populate('event');
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  if (photo.event.photographer.toString() !== req.photographerId)
    return res.status(403).json({ error: 'Forbidden' });

  await cloudinary.uploader.destroy(photo.cloudinaryId);
  await photo.deleteOne();
  await Event.findByIdAndUpdate(photo.event._id, { $inc: { photoCount: -1 } });

  res.json({ message: 'Deleted' });
});

// Protected: save face descriptors for a photo (called after client-side detection)
router.patch('/:photoId/descriptors', requireAuth, async (req, res) => {
  const { faceDescriptors } = req.body;
  const photo = await Photo.findById(req.params.photoId).populate('event');
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  if (photo.event.photographer.toString() !== req.photographerId)
    return res.status(403).json({ error: 'Forbidden' });

  photo.faceDescriptors = faceDescriptors;
  photo.hasFaces = faceDescriptors.length > 0;
  await photo.save();

  res.json({ ok: true, hasFaces: photo.hasFaces });
});

module.exports = router;
