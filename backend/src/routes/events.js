const router = require('express').Router();
const QRCode = require('qrcode');
const Event = require('../models/Event');
const Photo = require('../models/Photo');
const requireAuth = require('../middleware/auth');
const { cloudinary } = require('../middleware/upload');

// Public: get event by slug (for customers)
router.get('/public/:slug', async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug })
    .populate('photographer', 'name');
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Protected routes (photographer only)
router.use(requireAuth);

router.get('/', async (req, res) => {
  const events = await Event.find({ photographer: req.photographerId })
    .sort('-createdAt');
  res.json(events);
});

router.post('/', async (req, res) => {
  const { title, description, date } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Title and date required' });

  const event = await Event.create({
    title,
    description,
    date,
    photographer: req.photographerId,
  });
  res.status(201).json(event);
});

router.get('/:id', async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, photographer: req.photographerId });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

router.put('/:id', async (req, res) => {
  const event = await Event.findOneAndUpdate(
    { _id: req.params.id, photographer: req.photographerId },
    req.body,
    { new: true }
  );
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

router.delete('/:id', async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, photographer: req.photographerId });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Delete all photos from Cloudinary
  const photos = await Photo.find({ event: event._id });
  await Promise.all(photos.map(p => cloudinary.uploader.destroy(p.cloudinaryId)));
  await Photo.deleteMany({ event: event._id });
  await event.deleteOne();

  res.json({ message: 'Event deleted' });
});

// Generate QR code for event
router.get('/:id/qr', async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, photographer: req.photographerId });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${frontendUrl}/gallery/${event.slug}`;
  const qr = await QRCode.toDataURL(url, { width: 400, margin: 2 });

  res.json({ qr, url });
});

module.exports = router;
