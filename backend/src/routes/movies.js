const express = require('express');
const pool  = require('../config/db');
const { searchMulti, getMovieDetails, getTvShowDetails } = require('../services/tmdb');

const router = express.Router();

// ─── Helper: save a TMDB item into local DB ───────────────────────────────────
async function saveToLocalDb(item, mediaType) {
  const title       = item.title       || item.name        || 'Untitled';
  const releaseDate = item.release_date || item.first_air_date || null;
  const genreIds    = (item.genres || []).map(g => g.id);

  await pool.query(
    `INSERT INTO movies
       (id, title, overview, poster_path, backdrop_path, release_date,
        vote_average, vote_count, popularity, language, adult, media_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO UPDATE SET
       title        = EXCLUDED.title,
       overview     = EXCLUDED.overview,
       popularity   = EXCLUDED.popularity,
       vote_average = EXCLUDED.vote_average,
       media_type   = EXCLUDED.media_type`,
    [
      item.id, title, item.overview || '',
      item.poster_path, item.backdrop_path,
      releaseDate || null,
      item.vote_average || 0, item.vote_count || 0,
      item.popularity   || 0,
      item.original_language || 'en',
      item.adult || false,
      mediaType,
    ]
  );

  for (const gId of genreIds) {
    // Only insert if genre exists in our genres table
    await pool.query(
      'INSERT INTO movie_genres (movie_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [item.id, gId]
    );
  }
}

// ─── GET /api/movies ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  const { page = 1, limit = 20, genreId, type } = req.query;
  const offset = (page - 1) * limit;

  try {
    const params  = [];
    const filters = [];

    if (genreId) {
      params.push(genreId);
      filters.push(`m.id IN (SELECT movie_id FROM movie_genres WHERE genre_id = $${params.length})`);
    }
    if (type === 'movie' || type === 'tv') {
      params.push(type);
      filters.push(`m.media_type = $${params.length}`);
    } else if (type === 'anime') {
      filters.push(`m.id IN (SELECT movie_id FROM movie_genres WHERE genre_id = 16)`);
    }

    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT m.*, array_agg(g.name) as genres
       FROM movies m
       LEFT JOIN movie_genres mg ON m.id = mg.movie_id
       LEFT JOIN genres g ON mg.genre_id = g.id
       ${where}
       GROUP BY m.id
       ORDER BY m.popularity DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/movies/search ───────────────────────────────────────────────────
router.get('/search', async (req, res, next) => {
  const { q, type } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  try {
    const params = [`%${q}%`];
    let typeFilter = '';
    if (type === 'movie' || type === 'tv') {
      params.push(type);
      typeFilter = `AND media_type = $${params.length}`;
    }

    const localResult = await pool.query(
      `SELECT * FROM movies WHERE title ILIKE $1 ${typeFilter} ORDER BY popularity DESC LIMIT 20`,
      params
    );

    if (localResult.rows.length >= 5) {
      return res.json({ source: 'local', results: localResult.rows });
    }

    // Fall back to live TMDB
    const tmdbResults = await searchMulti(q);
    const normalized  = tmdbResults.map(item => ({
      id:            item.id,
      title:         item.title || item.name,
      overview:      item.overview,
      poster_path:   item.poster_path,
      backdrop_path: item.backdrop_path,
      release_date:  item.release_date || item.first_air_date,
      vote_average:  item.vote_average,
      popularity:    item.popularity,
      media_type:    item.media_type || 'movie',
      genre_ids:     item.genre_ids || [],
      _live:         true,
    }));

    const localIds = new Set(localResult.rows.map(r => r.id));
    const merged   = [
      ...localResult.rows,
      ...normalized.filter(r => !localIds.has(r.id)),
    ];

    res.json({ source: 'tmdb', results: merged });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/movies/:id ──────────────────────────────────────────────────────
// Auto-fetches from TMDB and saves locally if not found in DB
router.get('/:id', async (req, res, next) => {
  const { id }  = req.params;
  const { type } = req.query; // 'tv' | 'movie' (default)

  try {
    // 1. Try local DB first
    const local = await pool.query(
      `SELECT m.*, array_agg(json_build_object('id', g.id, 'name', g.name)) as genres
       FROM movies m
       LEFT JOIN movie_genres mg ON m.id = mg.movie_id
       LEFT JOIN genres g ON mg.genre_id = g.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [id]
    );

    if (local.rows.length > 0) {
      return res.json(local.rows[0]);
    }

    // 2. Not found locally → fetch from TMDB
    console.log(`[Movies] ${id} not in local DB — fetching from TMDB (type: ${type || 'movie'})`);
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    let tmdbData;
    try {
      tmdbData = mediaType === 'tv'
        ? await getTvShowDetails(Number(id))
        : await getMovieDetails(Number(id));
    } catch (tmdbErr) {
      return res.status(404).json({ error: 'Content not found on TMDB either', tmdb: tmdbErr.message });
    }

    // 3. Save to local DB
    await saveToLocalDb(tmdbData, mediaType);

    // 4. Re-fetch from DB so we get the genres joined properly
    const saved = await pool.query(
      `SELECT m.*, array_agg(json_build_object('id', g.id, 'name', g.name)) as genres
       FROM movies m
       LEFT JOIN movie_genres mg ON m.id = mg.movie_id
       LEFT JOIN genres g ON mg.genre_id = g.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [id]
    );

    res.json(saved.rows[0] || { ...tmdbData, media_type: mediaType });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
