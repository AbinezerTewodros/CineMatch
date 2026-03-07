const express = require('express');
const { getPersonalizedRecommendations, getSimilarMovies } = require('../services/recommender');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/recommendations ─────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const recs = await getPersonalizedRecommendations(req.user.id);
    res.json(recs);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/recommendations/trending ───────────────────────────────────────
// ?type=movie|tv|anime|all   ?limit=N
router.get('/trending', async (req, res, next) => {
  const { type = 'all', limit = 24 } = req.query;
  const n = Math.min(Number(limit) || 24, 100); // cap at 100

  try {
    let result;

    if (type === 'movie' || type === 'tv') {
      result = await pool.query(
        `SELECT * FROM movies WHERE media_type = $1 ORDER BY popularity DESC LIMIT $2`,
        [type, n]
      );
    } else if (type === 'anime') {
      result = await pool.query(
        `SELECT DISTINCT m.* FROM movies m
         JOIN movie_genres mg ON m.id = mg.movie_id
         WHERE mg.genre_id = 16
         ORDER BY m.popularity DESC LIMIT $1`,
        [n]
      );
    } else {
      // All types
      result = await pool.query(
        `SELECT * FROM movies ORDER BY popularity DESC LIMIT $1`,
        [n]
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
