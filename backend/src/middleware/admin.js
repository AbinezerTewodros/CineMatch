/**
 * Admin middleware — requires valid JWT + is_admin = true
 */
const jwt  = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      'SELECT id, is_admin, is_banned FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!rows[0])           return res.status(401).json({ error: 'User not found' });
    if (rows[0].is_banned)  return res.status(403).json({ error: 'Account suspended' });
    if (!rows[0].is_admin)  return res.status(403).json({ error: 'Admin access required' });

    req.user = decoded;
    next();
  } catch (_) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
