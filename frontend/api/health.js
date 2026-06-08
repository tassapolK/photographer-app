import { getDb } from './_db.js';
import { setCors } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Ping MongoDB to warm up the connection pool in this function process.
  // Called from the frontend on every app load as a keep-alive / pre-warm.
  let db = 'ok';
  try { await (await getDb()).command({ ping: 1 }); }
  catch { db = 'cold'; }

  res.json({ status: 'ok', db, timestamp: new Date().toISOString() });
}
