/**
 * Onboarding Routes
 * GET  /api/onboarding/status       — completion check
 * GET  /api/onboarding/seed-movies  — dynamic seed movies based on answers
 * POST /api/onboarding              — save & bootstrap taste profile
 */
const express        = require('express');
const pool           = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { buildTasteProfile } = require('../services/tasteProfile');

const router = express.Router();
router.use(authMiddleware);

// ── Mood → TMDB genre-ID map ──────────────────────────────────────────────────
const MOOD_GENRES = {
  funny:       [35],           // Comedy
  thrilling:   [53, 28],       // Thriller, Action
  emotional:   [18],           // Drama
  mindBending: [878, 9648],    // Sci-Fi, Mystery
  romantic:    [10749, 18],    // Romance, Drama
  adventure:   [12, 28],       // Adventure, Action
  scary:       [27, 53],       // Horror, Thriller
  inspiring:   [18, 10751],    // Drama, Family
  action:      [28, 12],       // Action, Adventure
};

// Tone → additional genre nudges
const TONE_GENRES = {
  feelgood:    [35, 10751, 10749], // Comedy, Family, Romance
  dark:        [27, 53, 80],       // Horror, Thriller, Crime
  thoughtful:  [18, 878, 9648],    // Drama, Sci-Fi, Mystery
  intense:     [28, 53, 36],       // Action, Thriller, History
};

// Era → year range
const ERA_YEARS = {
  classic: { min: 1920, max: 1979 },
  golden:  { min: 1980, max: 1999 },
  modern:  { min: 2000, max: 2014 },
  recent:  { min: 2015, max: 2030 },
};

// ── GET /api/onboarding/seed-movies ──────────────────────────────────────────
router.get('/seed-movies', async (req, res, next) => {
  try {
    const {
      moods    = '',
      eras     = '',
      genres   = '',   // explicit genre IDs from genre-picker step
      tone     = '',
      type     = '',   // 'movie' | 'tv' | ''
    } = req.query;

    const moodList  = moods  ? moods.split(',')  : [];
    const eraList   = eras   ? eras.split(',')   : [];
    const genreList = genres ? genres.split(',').map(Number) : [];
    const toneList  = tone   ? tone.split(',')   : [];

    // Build genre ID set from moods + explicit genres + tone
    const genreSet = new Set(genreList);
    for (const m of moodList)  (MOOD_GENRES[m]  || []).forEach(g => genreSet.add(g));
    for (const t of toneList)  (TONE_GENRES[t]  || []).forEach(g => genreSet.add(g));
    const targetGenres = [...genreSet];

    // Build year filter
    let yearMin = 1920, yearMax = 2030;
    if (eraList.length > 0) {
      const eraBounds = eraList.map(e => ERA_YEARS[e]).filter(Boolean);
      if (eraBounds.length > 0) {
        yearMin = Math.min(...eraBounds.map(e => e.min));
        yearMax = Math.max(...eraBounds.map(e => e.max));
      }
    }

    const params  = [yearMin, yearMax];
    let mediaFilter = '';
    if (type === 'movie' || type === 'tv') {
      params.push(type);
      mediaFilter = `AND m.media_type = $${params.length}`;
    }

    let genreFilter = '';
    if (targetGenres.length > 0) {
      params.push(targetGenres);
      genreFilter = `AND mg.genre_id = ANY($${params.length})`;
    }

    // Fetch 12 distinct well-known movies matching the profile
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (m.id)
              m.id, m.title, m.poster_path, m.media_type,
              EXTRACT(YEAR FROM m.release_date)::int AS year,
              m.vote_average, m.vote_count
       FROM movies m
       LEFT JOIN movie_genres mg ON mg.movie_id = m.id
       WHERE m.poster_path IS NOT NULL
         AND m.vote_count  >= 500
         AND m.vote_average >= 6.0
         AND EXTRACT(YEAR FROM m.release_date) BETWEEN $1 AND $2
         ${genreFilter}
         ${mediaFilter}
       ORDER BY m.id, m.popularity DESC, m.vote_count DESC
       LIMIT 60`,
      params
    );

    // Reservoir-sample 12 so results stay varied (not always the same top 12)
    const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, 12);

    // Fallback: if <8 results, fill with popular movies regardless of filters
    if (shuffled.length < 8) {
      const { rows: fallback } = await pool.query(
        `SELECT m.id, m.title, m.poster_path, m.media_type,
                EXTRACT(YEAR FROM m.release_date)::int AS year,
                m.vote_average
         FROM movies m
         WHERE m.poster_path IS NOT NULL AND m.vote_count >= 1000
         ORDER BY m.popularity DESC LIMIT 20`
      );
      const existing = new Set(shuffled.map(m => m.id));
      for (const f of fallback) {
        if (!existing.has(f.id) && shuffled.length < 12) shuffled.push(f);
      }
    }

    res.json(shuffled);
  } catch (err) { next(err); }
});

// ── GET /api/onboarding/status ────────────────────────────────────────────────

// ── GET status ────────────────────────────────────────────────────────────────
router.get('/status', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT completed FROM onboarding_responses WHERE user_id = $1',
      [req.user.id]
    );

    // Also check if user has enough ratings to skip onboarding
    const { rows: ratingRows } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM user_ratings WHERE user_id = $1',
      [req.user.id]
    );

    const ratingCount = parseInt(ratingRows[0]?.cnt || 0);
    const completed   = rows[0]?.completed === true || ratingCount >= 5;

    res.json({ completed, rating_count: ratingCount });
  } catch (err) { next(err); }
});

// ── POST save onboarding ──────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  const {
    mood_preference,
    era_preference,
    language_preference,
    seed_ratings,        // { movieId: rating, ... }
    preferred_genres,    // genre IDs from mood selections
    min_rating,
  } = req.body;

  try {
    // Save onboarding record
    await pool.query(
      `INSERT INTO onboarding_responses
         (user_id, completed, mood_preference, era_preference, language_preference, seed_ratings, completed_at)
       VALUES ($1, true, $2, $3, $4, $5, now())
       ON CONFLICT (user_id) DO UPDATE SET
         completed           = true,
         mood_preference     = EXCLUDED.mood_preference,
         era_preference      = EXCLUDED.era_preference,
         language_preference = EXCLUDED.language_preference,
         seed_ratings        = EXCLUDED.seed_ratings,
         completed_at        = now()`,
      [
        req.user.id,
        mood_preference     || [],
        era_preference      || [],
        language_preference || ['en'],
        seed_ratings        ? JSON.stringify(seed_ratings) : '{}',
      ]
    );

    // Save seed ratings as proper user_ratings entries
    if (seed_ratings && Object.keys(seed_ratings).length > 0) {
      for (const [movieId, rating] of Object.entries(seed_ratings)) {
        if (rating && Number(rating) >= 1) {
          await pool.query(
            `INSERT INTO user_ratings (user_id, movie_id, rating)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = EXCLUDED.rating`,
            [req.user.id, Number(movieId), Number(rating)]
          );
        }
      }
    }

    // Update user_preferences with genre and language preferences
    if (preferred_genres?.length) {
      await pool.query(
        `INSERT INTO user_preferences (user_id, preferred_genres, preferred_languages, min_rating)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           preferred_genres    = EXCLUDED.preferred_genres,
           preferred_languages = EXCLUDED.preferred_languages,
           min_rating          = EXCLUDED.min_rating`,
        [req.user.id, preferred_genres, language_preference || ['en'], min_rating || 6.0]
      );
    }

    // Build fresh taste profile
    const profile = await buildTasteProfile(req.user.id);

    res.json({ success: true, profile_genres: Object.keys(profile.genre_scores || {}).length });
  } catch (err) { next(err); }
});

module.exports = router;
