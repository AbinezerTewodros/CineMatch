const express = require('express');
const { getPersonalizedRecommendations, getSimilarMovies } = require('../services/recommender');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/recommendations
// @desc    Get personalized recommendations
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const recs = await getPersonalizedRecommendations(req.user.id);
    res.json(recs);
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/recommendations/trending
// @desc    Get trending movies (fallback)
router.get('/trending', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM movies ORDER BY popularity DESC LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/recommendations/similar/:movieId
// @desc    Get similar movies
router.get('/similar/:movieId', async (req, res, next) => {
  try {
    const similar = await getSimilarMovies(req.params.movieId);
    res.json(similar);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
