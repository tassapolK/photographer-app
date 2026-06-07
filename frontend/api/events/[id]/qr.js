const { getDb } = require('../../_db');
const { verifyToken, setCors } = require('../../_auth');
const QRCode = require('qrcode');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const db = await getDb();
  const event = await db.collection('events').findOne({ _id: id });

  if (!event || event.photographer !== user.id) return res.status(404).json({ error: 'Not found' });

  const frontendUrl = process.env.FRONTEND_URL || 'https://photographer-app-nu.vercel.app';
  const url = `${frontendUrl}/gallery/${event.slug}`;
  const qr = await QRCode.toDataURL(url);

  res.json({ qr, url });
};
