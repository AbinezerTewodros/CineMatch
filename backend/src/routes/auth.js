const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit  = require('express-rate-limit');
const pool       = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── Rate limiters ──────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  message: { error: 'Too many accounts created from this IP. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Validation helpers ─────────────────────────────────────────────────────────
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const validateRegister = [
  body('email')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3–20 characters')
    .matches(USERNAME_REGEX).withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const validatePasswordChange = [
  body('new_password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(400).json({ error: first.msg, field: first.path });
  }
  return null;
};

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', registerLimiter, validateRegister, async (req, res, next) => {
  const validationError = handleValidation(req, res);
  if (validationError !== null) return;

  const { email, password, username } = req.body;

  try {
    // Duplicate check — separate errors for email vs username
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists', field: 'email' });
    }
    const usernameCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This username is already taken', field: 'username' });
    }

    const salt         = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, username, auth_provider, last_login_at)
       VALUES ($1, $2, $3, 'local', now())
       RETURNING id, email, username, avatar_emoji, created_at`,
      [email, password_hash, username]
    );

    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({ token, user: newUser.rows[0] });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', loginLimiter, validateLogin, async (req, res, next) => {
  const validationError = handleValidation(req, res);
  if (validationError !== null) return;

  const { username, password } = req.body;

  try {
    // Allow login with email OR username
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    }

    // Google-only accounts have no password
    if (!user.password_hash) {
      return res.status(400).json({ error: 'This account was created with Google. Use Google Sign-In.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = now(), login_count = login_count + 1 WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      token,
      user: {
        id:          user.id,
        email:       user.email,
        username:    user.username,
        avatar_emoji: user.avatar_emoji,
        is_admin:    user.is_admin,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, username, avatar_url, avatar_emoji, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── PUT /api/auth/profile ──────────────────────────────────────────────────────
router.put('/profile', authMiddleware, [
  body('username').optional().trim()
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3–20 characters')
    .matches(USERNAME_REGEX).withMessage('Username can only contain letters, numbers, and underscores'),
], async (req, res, next) => {
  const validationError = handleValidation(req, res);
  if (validationError !== null) return;

  const { username, avatar_emoji } = req.body;
  try {
    if (username) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2', [username, req.user.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken', field: 'username' });
      }
    }

    const updated = await pool.query(
      `UPDATE users SET
         username     = COALESCE($1, username),
         avatar_emoji = COALESCE($2, avatar_emoji)
       WHERE id = $3
       RETURNING id, email, username, avatar_emoji, is_admin, created_at`,
      [username || null, avatar_emoji || null, req.user.id]
    );
    res.json(updated.rows[0]);
  } catch (err) { next(err); }
});

// ── PUT /api/auth/password ─────────────────────────────────────────────────────
router.put('/password', authMiddleware, validatePasswordChange, async (req, res, next) => {
  const validationError = handleValidation(req, res);
  if (validationError !== null) return;

  const { current_password, new_password } = req.body;
  if (!current_password) {
    return res.status(400).json({ error: 'Current password is required' });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Google accounts cannot set a password here' });
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(new_password, salt);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
