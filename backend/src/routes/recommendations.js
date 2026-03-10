const express = require('express');
const { getPersonalizedRecommendations, getSimilarMovies } = require('../services/recommender');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/recommendations ─────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { type } = req.query;
    const recs = await getPersonalizedRecommendations(req.user.id, type || null);
    res.json(recs);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/recommendations/trending ───────────────────────────────────────
// ?type=movie|tv|anime|all   ?limit=N   ?page=N
router.get('/trending', async (req, res, next) => {
  const { type = 'all', limit = 24, page = 1 } = req.query;
  const n      = Math.min(Number(limit) || 24, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * n;

  try {
    let result;

    if (type === 'movie' || type === 'tv') {
      result = await pool.query(
        `SELECT * FROM movies WHERE media_type = $1
         ORDER BY popularity DESC LIMIT $2 OFFSET $3`,
        [type, n, offset]
      );
    } else if (type === 'anime') {
      result = await pool.query(
        `SELECT DISTINCT m.* FROM movies m
         JOIN movie_genres mg ON m.id = mg.movie_id
         WHERE mg.genre_id = 16
         ORDER BY m.popularity DESC LIMIT $1 OFFSET $2`,
        [n, offset]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM movies ORDER BY popularity DESC LIMIT $1 OFFSET $2`,
        [n, offset]
      );
    }

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/recommendations/similar/:movieId ────────────────────────────────
router.get('/similar/:movieId', async (req, res, next) => {
  try {
    const similar = await getSimilarMovies(req.params.movieId);
    res.json(similar);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
