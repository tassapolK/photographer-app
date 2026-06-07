const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Photographer = require('../models/Photographer');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });

  const existing = await Photographer.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const photographer = await Photographer.create({ name, email, password });
  res.status(201).json({ token: signToken(photographer._id), name: photographer.name });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const photographer = await Photographer.findOne({ email });
  if (!photographer || !(await photographer.comparePassword(password)))
    return res.status(401).json({ error: 'Invalid email or password' });

  res.json({ token: signToken(photographer._id), name: photographer.name });
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  const photographer = await Photographer.findById(req.photographerId).select('-password');
  res.json(photographer);
});

module.exports = router;
