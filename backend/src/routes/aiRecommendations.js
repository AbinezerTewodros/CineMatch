/**
 * AI Recommendation Routes
 * GET  /api/ai/recommendations        — LLM-ranked personalised recs
 * GET  /api/ai/taste-profile          — user's computed taste profile
 * POST /api/ai/search                 — conversational recommendation query
 */
const express         = require('express');
const pool            = require('../config/db');
const authMiddleware  = require('../middleware/auth');
const { getAIRecommendations } = require('../services/aiRanker');
const { getTasteProfile }      = require('../services/tasteProfile');

const router = express.Router();
router.use(authMiddleware);

// ── GET /api/ai/recommendations ───────────────────────────────────────────────
router.get('/recommendations', async (req, res, next) => {
  const { type } = req.query; // 'movie' | 'tv' | 'anime' | undefined
  try {
    const result = await getAIRecommendations(req.user.id, type || null);
    res.json(result);
  } catch (err) { next(err); }
});

// ── GET /api/ai/taste-profile ─────────────────────────────────────────────────
router.get('/taste-profile', async (req, res, next) => {
  try {
    const profile = await getTasteProfile(req.user.id);

    // Enrich genre IDs with names
    const genreIds = Object.keys(profile.genre_scores || {}).map(Number);
    let genreNames = {};
    if (genreIds.length > 0) {
      const { rows } = await pool.query(
        'SELECT id, name FROM genres WHERE id = ANY($1)',
        [genreIds]
      );
      genreNames = Object.fromEntries(rows.map(r => [r.id, r.name]));
    }

    const enrichedGenres = Object.entries(profile.genre_scores || {})
      .map(([id, score]) => ({ id: Number(id), name: genreNames[Number(id)] || id, score }))
      .sort((a, b) => b.score - a.score);

    res.json({
      genres:      enrichedGenres,
      era_scores:  profile.era_scores,
      avg_rating:  profile.avg_rating_given,
      rating_count: profile.rating_count,
      last_updated: profile.last_updated,
    });
  } catch (err) { next(err); }
});

// ── POST /api/ai/search ───────────────────────────────────────────────────────
// Conversational: "show me something like Parasite but lighter"
router.post('/search', async (req, res, next) => {
  const { query } = req.body;
  if (!query || !query.trim()) return res.status(400).json({ error: 'Query is required' });

  try {
    const result = await getAIRecommendations(req.user.id, null, query.trim());
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
