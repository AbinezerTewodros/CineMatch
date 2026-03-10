/**
 * GET /api/media/:id/details?type=movie|tv
 * Live TMDB data: cast, crew, trailer, TV season/status info.
 * Never uses local DB — always fresh from TMDB.
 */
const express = require('express');
const { getMovieDetails, getTvShowDetails } = require('../services/tmdb');

const router = express.Router();

router.get('/:id/details', async (req, res, next) => {
  const { id }  = req.params;
  const { type } = req.query;
  const isTV    = type === 'tv';

  try {
    const data = isTV
      ? await getTvShowDetails(Number(id))
      : await getMovieDetails(Number(id));

    // Cast — top 12 actors
    const cast = (data.credits?.cast || [])
      .slice(0, 12)
      .map(p => ({
        id:            p.id,
        name:          p.name,
        character:     p.character,
        profile_path:  p.profile_path,
        order:         p.order,
      }));

    // Crew — director(s) for movies, creators for TV
    let crew = [];
    if (isTV) {
      crew = (data.created_by || []).map(p => ({
        id:           p.id,
        name:         p.name,
        job:          'Creator',
        profile_path: p.profile_path,
      }));
    } else {
      crew = (data.credits?.crew || [])
        .filter(p => p.job === 'Director' || p.job === 'Screenplay' || p.job === 'Producer')
        .slice(0, 5)
        .map(p => ({
          id:           p.id,
          name:         p.name,
          job:          p.job,
          profile_path: p.profile_path,
        }));
    }

    // Trailer (prefer official YouTube trailer)
    const videos = data.videos?.results || [];
    const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube')
      || videos.find(v => v.site === 'YouTube')
      || null;

    // TV-specific fields
    const tvInfo = isTV ? {
      number_of_seasons:  data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      status:             data.status,           // "Returning Series" | "Ended" | "Canceled"
      networks:           (data.networks || []).map(n => ({ id: n.id, name: n.name, logo_path: n.logo_path })),
      episode_run_time:   data.episode_run_time,
    } : null;

    res.json({ cast, crew, trailer, tvInfo });
  } catch (err) {
    console.error('[Media Details]', err.message);
    res.status(404).json({ error: 'Could not fetch media details from TMDB', detail: err.message });
  }
});

module.exports = router;
