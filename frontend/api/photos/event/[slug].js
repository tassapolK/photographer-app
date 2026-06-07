const { getDb } = require('../../_db');
const { setCors } = require('../../_auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { slug } = req.query;
  const db = await getDb();
  const event = await db.collection('events').findOne({ slug });
  if (!event) return res.status(404).json({ error: 'Not found' });

  const photos = await db.collection('photos').find({ event: event._id }).toArray();
  res.json(photos);
};
