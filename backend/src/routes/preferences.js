const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/preferences
// @desc    Get my preferences
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM user_preferences WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.json({ preferred_genres: [], preferred_languages: ['en'], min_rating: 6.0 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// @route   PUT /api/preferences
// @desc    Update preferences
router.put('/', authMiddleware, async (req, res, next) => {
  const { preferred_genres, preferred_languages, min_rating } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO user_preferences (user_id, preferred_genres, preferred_languages, min_rating, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         preferred_genres = EXCLUDED.preferred_genres,
         preferred_languages = EXCLUDED.preferred_languages,
         min_rating = EXCLUDED.min_rating,
         updated_at = NOW()
       RETURNING *`,
      [req.user.id, preferred_genres || [], preferred_languages || ['en'], min_rating || 6.0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
