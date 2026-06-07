import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'photopro_secret';

export function signToken(id) {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(req) {
  const token = req.headers.authorization?.slice(7);
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
