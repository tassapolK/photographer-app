require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const app = express();

// In-memory data store
const photographers = new Map();
const events = new Map();
const photos = new Map();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Middleware
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.slice(7);
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (photographers.has(email)) return res.status(409).json({ error: 'Email exists' });
  const id = uuidv4();
  photographers.set(email, { id, name, email, password });
  res.status(201).json({ token: signToken(id), name });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = [...photographers.values()].find(u => u.email === email);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid' });
  res.json({ token: signToken(user.id), name: user.name });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = [...photographers.values()].find(u => u.id === req.user.id);
  res.json(user);
});

// Events routes
app.get('/api/events', requireAuth, (req, res) => {
  const userEvents = [...events.values()].filter(e => e.photographer === req.user.id);
  res.json(userEvents);
});

app.post('/api/events', requireAuth, (req, res) => {
  const { title, description, date } = req.body;
  const slug = uuidv4();
  const event = { _id: uuidv4(), slug, title, description, date, photographer: req.user.id, photoCount: 0, coverPhoto: '', createdAt: new Date() };
  events.set(event._id, event);
  res.status(201).json(event);
});

app.get('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event || event.photographer !== req.user.id) return res.status(404).json({ error: 'Not found' });
  res.json(event);
});

app.put('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event || event.photographer !== req.user.id) return res.status(404).json({ error: 'Not found' });
  Object.assign(event, req.body);
  res.json(event);
});

app.delete('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event || event.photographer !== req.user.id) return res.status(404).json({ error: 'Not found' });
  [...photos.keys()].forEach(k => {
    if (photos.get(k).event === req.params.id) photos.delete(k);
  });
  events.delete(req.params.id);
  res.json({ message: 'Deleted' });
});

app.get('/api/events/:id/qr', requireAuth, async (req, res) => {
  const event = events.get(req.params.id);
  if (!event || event.photographer !== req.user.id) return res.status(404).json({ error: 'Not found' });
  const url = `http://localhost:5173/gallery/${event.slug}`;
  const qr = await QRCode.toDataURL(url);
  res.json({ qr, url });
});

// Photos routes
app.get('/api/photos/event/:slug', (req, res) => {
  const event = [...events.values()].find(e => e.slug === req.params.slug);
  if (!event) return res.status(404).json({ error: 'Not found' });
  const eventPhotos = [...photos.values()].filter(p => p.event === event._id);
  res.json(eventPhotos);
});

app.post('/api/photos/event/:eventSlug/upload', requireAuth, (req, res) => {
  const event = [...events.values()].find(e => e.slug === req.params.eventSlug && e.photographer === req.user.id);
  if (!event) return res.status(404).json({ error: 'Not found' });

  const faceData = req.body.faceData ? JSON.parse(req.body.faceData) : {};
  const uploadedPhotos = [];

  // Create mock photos
  for (let i = 0; i < 3; i++) {
    const photo = {
      _id: uuidv4(),
      event: event._id,
      cloudinaryId: `demo_${uuidv4()}`,
      url: `https://via.placeholder.com/800x600?text=Demo+Photo+${i+1}`,
      thumbnailUrl: `https://via.placeholder.com/400x300?text=Photo+${i+1}`,
      originalName: `photo_${i+1}.jpg`,
      width: 800,
      height: 600,
      faceDescriptors: faceData[i] || [],
      hasFaces: (faceData[i]?.length || 0) > 0,
      createdAt: new Date(),
    };
    photos.set(photo._id, photo);
    uploadedPhotos.push({ _id: photo._id, url: photo.url, thumbnailUrl: photo.thumbnailUrl });
  }

  event.photoCount += uploadedPhotos.length;
  if (!event.coverPhoto) event.coverPhoto = uploadedPhotos[0].thumbnailUrl;

  res.status(201).json(uploadedPhotos);
});

app.post('/api/photos/event/:slug/face-match', (req, res) => {
  const event = [...events.values()].find(e => e.slug === req.params.slug);
  if (!event) return res.status(404).json({ error: 'Not found' });
  const eventPhotos = [...photos.values()].filter(p => p.event === event._id);
  // Mock: return all photos with faces
  const matchedIds = eventPhotos.filter(p => p.hasFaces).map(p => p._id.toString());
  res.json({ matchedIds });
});

app.delete('/api/photos/:photoId', requireAuth, (req, res) => {
  const photo = photos.get(req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Not found' });
  const event = events.get(photo.event);
  if (event.photographer !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  event.photoCount--;
  photos.delete(req.params.photoId);
  res.json({ message: 'Deleted' });
});

app.get('/api/events/public/:slug', (req, res) => {
  const event = [...events.values()].find(e => e.slug === req.params.slug);
  if (!event) return res.status(404).json({ error: 'Not found' });
  const photographer = [...photographers.values()].find(p => p.id === event.photographer);
  res.json({ ...event, photographer: { name: photographer.name } });
});

app.get('/health', (req, res) => res.json({ status: 'ok', mode: 'mock' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Mock server running on http://localhost:${PORT}`));
