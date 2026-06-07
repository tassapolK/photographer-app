const { setCors } = require('./_auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.json({ status: 'ok', mode: 'vercel-serverless', timestamp: new Date().toISOString() });
};
