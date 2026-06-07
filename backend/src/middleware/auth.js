const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    req.photographerId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
