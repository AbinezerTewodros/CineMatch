/**
 * GET /api/person/:id          → person bio + known for
 * GET /api/person/:id/credits  → combined movie+TV credits
 */
const express = require('express');
const axios   = require('axios');

const router = express.Router();

const tmdb = axios.create({
  baseURL: process.env.TMDB_BASE_URL,
  params:  { api_key: process.env.TMDB_API_KEY },
});

// Person bio
router.get('/:id', async (req, res, next) => {
  try {
    const { data } = await tmdb.get(`/person/${req.params.id}`, {
      params: { append_to_response: 'combined_credits' },
    });

    res.json({
      id:           data.id,
      name:         data.name,
      biography:    data.biography,
      birthday:     data.birthday,
      place_of_birth: data.place_of_birth,
      profile_path: data.profile_path,
      known_for_department: data.known_for_department,
      popularity:   data.popularity,
    });
  } catch (err) {
    next(err);
  }
});

// Combined movie + TV credits
router.get('/:id/credits', async (req, res, next) => {
  try {
    const { data } = await tmdb.get(`/person/${req.params.id}/combined_credits`);

    const normalize = item => ({
      id:           item.id,
      title:        item.title || item.name,
      media_type:   item.media_type,   // 'movie' | 'tv'
      poster_path:  item.poster_path,
      vote_average: item.vote_average,
      popularity:   item.popularity,
      release_date: item.release_date || item.first_air_date,
      character:    item.character,    // acting
      job:          item.job,          // crew
      department:   item.department,
    });

    // Acting credits (sorted by popularity)
    const acting = (data.cast || [])
      .filter(i => i.poster_path)
      .sort((a, b) => b.popularity - a.popularity)
      .map(normalize);

    // Directing / crew credits
    const directing = (data.crew || [])
      .filter(i => i.poster_path && (i.job === 'Director' || i.department === 'Directing'))
      .sort((a, b) => b.popularity - a.popularity)
      .map(normalize);

    res.json({ acting, directing });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
