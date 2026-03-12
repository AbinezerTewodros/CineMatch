/**
 * Taste Profile Computation Service
 * 
 * Builds and caches a numeric user taste model from:
 *  - explicit ratings (weighted, recency-decayed)
 *  - watchlist additions (treated as implicit rating=7.5)
 *  - onboarding responses (cold-start bootstrap)
 *  - search click-through
 */

const pool  = require('../config/db');
const redis = require('../config/redis');

const PROFILE_TTL = 6 * 60 * 60; // 6 hours in seconds

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Exponential recency decay: half-life = 90 days */
const recencyWeight = (dateStr) => {
  const daysAgo = (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
  return Math.exp(-daysAgo / 90);
};

/** Map release year → era bucket */
const eraBucket = (dateStr) => {
  if (!dateStr) return 'unknown';
  const y = new Date(dateStr).getFullYear();
  if (y < 1980) return 'pre1980';
  if (y < 1990) return '1980s';
  if (y < 2000) return '1990s';
  if (y < 2010) return '2000s';
  if (y < 2020) return '2010s';
  return 'recent';
};

/** Simple sigmoid 0→1 */
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

// ── Core builder ───────────────────────────────────────────────────────────────

async function buildTasteProfile(userId) {
  // ── 1. Fetch all ratings ────────────────────────────────────────────────────
  const { rows: ratings } = await pool.query(
    `SELECT ur.movie_id, ur.rating, ur.created_at,
            m.release_date,
            array_agg(mg.genre_id) AS genre_ids
     FROM user_ratings ur
     JOIN movies m ON m.id = ur.movie_id
     LEFT JOIN movie_genres mg ON mg.movie_id = m.id
     WHERE ur.user_id = $1
     GROUP BY ur.movie_id, ur.rating, ur.created_at, m.release_date`,
    [userId]
  );

  // ── 2. Fetch watchlist (implicit interest signal) ───────────────────────────
  const { rows: watchlist } = await pool.query(
    `SELECT w.movie_id, w.added_at,
            m.release_date,
            array_agg(mg.genre_id) AS genre_ids
     FROM watchlist w
     JOIN movies m ON m.id = w.movie_id
     LEFT JOIN movie_genres mg ON mg.movie_id = m.id
     WHERE w.user_id = $1
     GROUP BY w.movie_id, w.added_at, m.release_date`,
    [userId]
  );

  // ── 3. Fetch onboarding ────────────────────────────────────────────────────
  const { rows: [onboarding] } = await pool.query(
    'SELECT * FROM onboarding_responses WHERE user_id = $1',
    [userId]
  );

  // ── 4. Merge signals into a unified event list ────────────────────────────
  const events = [];

  for (const r of ratings) {
    events.push({
      genreIds:    r.genre_ids?.filter(Boolean) || [],
      score:       r.rating,          // 1-10
      weight:      recencyWeight(r.created_at),
      releaseDate: r.release_date,
      source:      'rating',
    });
  }

  for (const w of watchlist) {
    // Skip if already rated (rating signal is stronger)
    if (ratings.find(r => r.movie_id === w.movie_id)) continue;
    events.push({
      genreIds:    w.genre_ids?.filter(Boolean) || [],
      score:       7.5,               // implicit interest
      weight:      recencyWeight(w.added_at) * 0.6,
      releaseDate: w.release_date,
      source:      'watchlist',
    });
  }

  // ── 5. Compute avg rating ──────────────────────────────────────────────────
  const avgRating = ratings.length > 0
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : 7.0;

  // ── 6. Genre affinity scores ───────────────────────────────────────────────
  const genreRaw = {}; // genre_id → weighted deviation sum

  for (const e of events) {
    const deviation = (e.score - avgRating) * e.weight;
    for (const gId of e.genreIds) {
      genreRaw[gId] = (genreRaw[gId] || 0) + deviation;
    }
  }

  // Apply onboarding preferred genres as a baseline boost
  if (onboarding?.completed) {
    const { rows: prefGenres } = await pool.query(
      'SELECT preferred_genres FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    const prefs = prefGenres[0]?.preferred_genres || [];
    for (const gId of prefs) {
      genreRaw[gId] = (genreRaw[gId] || 0) + 2.0; // baseline +2
    }

    // Seed ratings from onboarding
    const seedRatings = onboarding.seed_ratings || {};
    for (const [movieId, rating] of Object.entries(seedRatings)) {
      // Seed ratings are already included via user_ratings table after onboarding saves them
      void movieId, rating;
    }
  }

  // Normalise to 0-1 via sigmoid
  const genreScores = {};
  for (const [gId, raw] of Object.entries(genreRaw)) {
    genreScores[gId] = sigmoid(raw * 0.3); // scale factor 0.3 to compress
  }

  // ── 7. Era scores ──────────────────────────────────────────────────────────
  const eraRaw = {};
  for (const e of events) {
    const era = eraBucket(e.releaseDate);
    const deviation = (e.score - avgRating) * e.weight;
    eraRaw[era] = (eraRaw[era] || 0) + deviation;
  }
  const eraScores = {};
  for (const [era, raw] of Object.entries(eraRaw)) {
    eraScores[era] = sigmoid(raw * 0.3);
  }

  // Apply onboarding era preference
  if (onboarding?.era_preference?.length) {
    const ERA_MAP = {
      classic: 'pre1980',
      golden:  '1980s',
      modern:  '2000s',
      recent:  'recent',
    };
    for (const ep of onboarding.era_preference) {
      const mapped = ERA_MAP[ep] || ep;
      eraScores[mapped] = Math.max(eraScores[mapped] || 0, 0.7);
    }
  }

  // ── 8. Persist to DB ───────────────────────────────────────────────────────
  const profile = {
    genre_scores:        genreScores,
    actor_affinities:    {},        // extended in future phase
    director_affinities: {},
    era_scores:          eraScores,
    avg_rating_given:    avgRating,
    rating_count:        ratings.length,
    last_updated:        new Date().toISOString(),
  };

  await pool.query(
    `INSERT INTO user_taste_profiles
       (user_id, genre_scores, era_scores, avg_rating_given, rating_count, last_updated)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       genre_scores = EXCLUDED.genre_scores,
       era_scores   = EXCLUDED.era_scores,
       avg_rating_given = EXCLUDED.avg_rating_given,
       rating_count = EXCLUDED.rating_count,
       last_updated = now()`,
    [userId, JSON.stringify(genreScores), JSON.stringify(eraScores), avgRating, ratings.length]
  );

  // Cache in Redis
  await redis.setex(`taste:${userId}`, PROFILE_TTL, JSON.stringify(profile));

  return profile;
}

// ── Public API ─────────────────────────────────────────────────────────────────

async function getTasteProfile(userId) {
  // Redis cache first
  const cached = await redis.get(`taste:${userId}`);
  if (cached) return JSON.parse(cached);

  // DB second
  const { rows: [row] } = await pool.query(
    'SELECT * FROM user_taste_profiles WHERE user_id = $1',
    [userId]
  );

  if (row) {
    const profile = {
      genre_scores:        row.genre_scores        || {},
      actor_affinities:    row.actor_affinities    || {},
      director_affinities: row.director_affinities || {},
      era_scores:          row.era_scores          || {},
      avg_rating_given:    row.avg_rating_given    || 7.0,
      rating_count:        row.rating_count        || 0,
      last_updated:        row.last_updated,
    };
    // Re-cache
    await redis.setex(`taste:${userId}`, PROFILE_TTL, JSON.stringify(profile));
    return profile;
  }

  // Not found — build fresh
  return buildTasteProfile(userId);
}

/** Invalidate cache and rebuild after a user action */
async function invalidateProfile(userId) {
  await redis.del(`taste:${userId}`);
  await redis.del(`ai_recs:${userId}`);
  // Rebuild async (don't await — next request will fetch it)
  buildTasteProfile(userId).catch(err => console.error('Profile rebuild error:', err));
}

module.exports = { getTasteProfile, buildTasteProfile, invalidateProfile };
