const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/ratings/me
// @desc    Get my ratings
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.rating, r.created_at, m.title, m.poster_path, m.id as movie_id
       FROM user_ratings r
       JOIN movies m ON r.movie_id = m.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/ratings
// @desc    Rate a movie
router.post('/', authMiddleware, async (req, res, next) => {
  const { movieId, rating } = req.body;
  if (!movieId || !rating) return res.status(400).json({ error: 'Movie ID and rating (1-10) are required' });

  try {
    const result = await pool.query(
      `INSERT INTO user_ratings (user_id, movie_id, rating, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, movie_id) 
       DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()
       RETURNING *`,
      [req.user.id, movieId, rating]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// @route   DELETE /api/ratings/:movieId
// @desc    Remove rating
router.delete('/:movieId', authMiddleware, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM user_ratings WHERE user_id = $1 AND movie_id = $2', [req.user.id, req.params.movieId]);
    res.json({ message: 'Rating removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
