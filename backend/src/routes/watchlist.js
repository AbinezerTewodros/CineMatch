const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/watchlist
// @desc    Get my watchlist
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT w.added_at, m.*
       FROM watchlist w
       JOIN movies m ON w.movie_id = m.id
       WHERE w.user_id = $1
       ORDER BY w.added_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/watchlist
// @desc    Add movie to watchlist
router.post('/', authMiddleware, async (req, res, next) => {
  const { movieId } = req.body;
  try {
    await pool.query(
      'INSERT INTO watchlist (user_id, movie_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, movieId]
    );
    res.json({ message: 'Added to watchlist' });
  } catch (err) {
    next(err);
  }
});

// @route   DELETE /api/watchlist/:movieId
// @desc    Remove from watchlist
router.delete('/:movieId', authMiddleware, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM watchlist WHERE user_id = $1 AND movie_id = $2', [req.user.id, req.params.movieId]);
    res.json({ message: 'Removed from watchlist' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
