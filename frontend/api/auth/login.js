const { getDb } = require('../_db');
const { signToken, setCors } = require('../_auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body;
    const db = await getDb();
    const user = await db.collection('photographers').findOne({ email, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ token: signToken(user.id), name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
