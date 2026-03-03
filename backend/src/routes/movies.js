const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// @route   GET /api/movies
// @desc    Get movies (paginated, filtered by genre)
router.get('/', async (req, res, next) => {
  const { page = 1, limit = 20, genreId } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT m.*, array_agg(g.name) as genres
      FROM movies m
      LEFT JOIN movie_genres mg ON m.id = mg.movie_id
      LEFT JOIN genres g ON mg.genre_id = g.id
    `;
    const params = [];

    if (genreId) {
      query += ` WHERE m.id IN (SELECT movie_id FROM movie_genres WHERE genre_id = $1)`;
      params.push(genreId);
    }

    query += `
      GROUP BY m.id
      ORDER BY m.popularity DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/movies/search
// @desc    Search movies by title
router.get('/search', async (req, res, next) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  try {
    const result = await pool.query(
      "SELECT * FROM movies WHERE title ILIKE $1 ORDER BY popularity DESC LIMIT 20",
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/movies/:id
// @desc    Get movie by ID
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.*, array_agg(json_build_object('id', g.id, 'name', g.name)) as genres
       FROM movies m
       LEFT JOIN movie_genres mg ON m.id = mg.movie_id
       LEFT JOIN genres g ON mg.genre_id = g.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
