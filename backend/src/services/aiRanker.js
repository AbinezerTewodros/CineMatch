/**
 * AI Ranker Service — uses Llama 3.3 70B Instruct (free, OpenRouter)
 * 
 * Flow:
 *  1. SQL fetches up to 200 candidate movies matched to taste profile genre scores
 *  2. LLM re-ranks top candidates and returns ordered IDs + one-line "because" reasons
 *  3. Result is cached per user for 6 hours (Redis)
 */

const axios = require('axios');
const pool  = require('../config/db');
const redis = require('../config/redis');
const { getTasteProfile } = require('./tasteProfile');

const AI_CACHE_TTL = 6 * 60 * 60; // 6 hours
const MODEL        = 'meta-llama/llama-3.3-70b-instruct:free';
const MAX_CANDIDATES = 150;
const FINAL_COUNT    = 30;

const openRouter = axios.create({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'X-Title':        'CineMatch AI',
    'Content-Type':   'application/json',
  },
  timeout: 30000,
});

// ── SQL Candidate Generation ───────────────────────────────────────────────────

async function fetchCandidates(userId, tasteProfile, mediaType = null) {
  const genreScores = tasteProfile.genre_scores || {};
  const topGenreIds = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([id]) => Number(id));

  const minRating = tasteProfile.avg_rating_given
    ? Math.max(tasteProfile.avg_rating_given - 1.5, 5.0)
    : 5.5;

  // Build params in explicit order: $1=userId, $2=minRating, $3=limit
  const params = [userId, minRating, MAX_CANDIDATES];

  let mediaFilter = '';
  if (mediaType === 'movie' || mediaType === 'tv') {
    params.push(mediaType);
    mediaFilter = `AND m.media_type = $${params.length}`;
  } else if (mediaType === 'anime') {
    mediaFilter = `AND EXISTS (SELECT 1 FROM movie_genres WHERE movie_id = m.id AND genre_id = 16)`;
  }

  let genreFilter = '';
  if (topGenreIds.length > 0) {
    params.push(topGenreIds);
    genreFilter = `AND EXISTS (
      SELECT 1 FROM movie_genres mg2
      WHERE mg2.movie_id = m.id AND mg2.genre_id = ANY($${params.length})
    )`;
  }

  const result = await pool.query(
    `SELECT m.id, m.title, m.overview, m.vote_average, m.release_date,
            m.media_type, m.poster_path,
            array_agg(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) AS genres
     FROM movies m
     LEFT JOIN movie_genres mg ON mg.movie_id = m.id
     LEFT JOIN genres g        ON g.id = mg.genre_id
     WHERE m.vote_average >= $2
       AND m.id NOT IN (
         SELECT movie_id FROM user_ratings WHERE user_id = $1
         UNION ALL
         SELECT movie_id FROM watchlist     WHERE user_id = $1
       )
       ${genreFilter}
       ${mediaFilter}
     GROUP BY m.id
     ORDER BY m.popularity DESC
     LIMIT $3`,
    params
  );

  return result.rows;
}


// ── LLM Re-ranking ────────────────────────────────────────────────────────────

async function rerankWithLLM(candidates, tasteProfile, userContext = '') {
  const genreScores = tasteProfile.genre_scores || {};
  const eraScores   = tasteProfile.era_scores   || {};

  // Top genres by score
  const topGenres = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id);

  // Fetch genre names
  let topGenreNames = '';
  if (topGenres.length > 0) {
    try {
      const { rows } = await pool.query(
        'SELECT id, name FROM genres WHERE id = ANY($1)',
        [topGenres.map(Number)]
      );
      topGenreNames = rows.map(r => `${r.name} (${(genreScores[r.id] * 100).toFixed(0)}%)`).join(', ');
    } catch (_) {}
  }

  const topEra = Object.entries(eraScores).sort(([, a], [, b]) => b - a)[0]?.[0] || 'any';

  // Keep candidate list small to stay within free model token limits
  const candidateList = candidates.slice(0, 40).map(c => ({
    id:     c.id,
    title:  c.title,
    year:   c.release_date ? new Date(c.release_date).getFullYear() : '?',
    genres: (c.genres || []).slice(0, 3).join('/'),
    rating: Number(c.vote_average).toFixed(1),
    type:   c.media_type,
  }));

  // Single combined prompt — free models respond better to one message
  const prompt = `You are CineMatch, a film recommendation AI. Re-rank movies for a user with this taste:
Favourite genres: ${topGenreNames || 'unknown'}
Preferred era: ${topEra}
Avg rating given: ${tasteProfile.avg_rating_given?.toFixed(1) || '7.0'}
${userContext ? `User request: ${userContext}` : ''}

Candidates (JSON): ${JSON.stringify(candidateList)}

Task: Pick the best ${FINAL_COUNT} movies from the candidates for this user.
For each, write a short reason (max 10 words) why it fits their taste.

IMPORTANT: Reply with ONLY a JSON object, no markdown, no explanation. Use this exact format:
{"recommendations":[{"id":12345,"because":"reason here"},{"id":67890,"because":"another reason"}]}`;

  const response = await openRouter.post('/chat/completions', {
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens:  1200,
    // NOTE: Do NOT set response_format — not supported by free Llama models
  });

  const raw = response.data.choices?.[0]?.message?.content || '';
  console.log('[aiRanker] LLM raw response (first 300 chars):', raw.slice(0, 300));

  if (!raw) throw new Error('LLM returned empty content');

  // Robust JSON extraction — handles code fences, leading text, etc.
  let parsed;
  try {
    // Try direct parse first
    parsed = JSON.parse(raw);
  } catch {
    // Strip markdown code fences if present
    const stripped = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    try {
      parsed = JSON.parse(stripped);
    } catch {
      // Extract first {...} block
      const match = stripped.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = { recommendations: [] }; }
      } else {
        parsed = { recommendations: [] };
      }
    }
  }

  const recs = parsed.recommendations || parsed.Recommendations || [];
  console.log(`[aiRanker] Parsed ${recs.length} recommendations from LLM`);
  return recs;
}


// ── Main Public Function ───────────────────────────────────────────────────────

async function getAIRecommendations(userId, mediaType = null, userQuery = '') {
  const cacheKey = `ai_recs:${userId}:${mediaType || 'all'}`;

  // Return cached result if fresh (and not a conversational query)
  if (!userQuery) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (_) {}
  }

  // 1. Get taste profile — gracefully degrade if tables don't exist yet
  let profile = { genre_scores: {}, era_scores: {}, avg_rating_given: 7.0, rating_count: 0 };
  let migrationNeeded = false;
  try {
    profile = await getTasteProfile(userId);
  } catch (profileErr) {
    console.warn('Taste profile unavailable (migration may be pending):', profileErr.message);
    migrationNeeded = true;
  }

  // 2. Get candidates from DB
  let candidates = [];
  try {
    candidates = await fetchCandidates(userId, profile, mediaType);
  } catch (candidateErr) {
    console.error('Candidate fetch failed:', candidateErr.message);
    // Last-resort: return popular movies with no filtering
    try {
      const { rows } = await pool.query(
        `SELECT * FROM movies WHERE vote_average >= 6
         ORDER BY popularity DESC LIMIT ${FINAL_COUNT}`
      );
      candidates = rows;
    } catch (_) {}
  }

  if (candidates.length === 0) {
    return { recommendations: [], metadata: { message: 'Not enough content in the database.' } };
  }

  // 3. Cold-start OR migration pending → skip LLM, use popularity with a generic reason
  if (profile.rating_count < 3 || migrationNeeded) {
    const because = migrationNeeded
      ? 'Run the DB migration to enable AI recommendations'
      : 'Popular pick you might enjoy';
    const basicRecs = candidates.slice(0, FINAL_COUNT).map(c => ({ ...c, because }));
    return {
      recommendations: basicRecs,
      metadata: { cold_start: true, migration_needed: migrationNeeded },
    };
  }

  // 4. LLM re-rank
  let ranked = [];
  try {
    ranked = await rerankWithLLM(candidates, profile, userQuery);
  } catch (err) {
    console.error('LLM re-rank failed, using SQL order:', err.message);
    // Return SQL-ordered candidates but still with a generic reason so badges show
    return {
      recommendations: candidates.slice(0, FINAL_COUNT).map(c => ({
        ...c,
        because: 'Matches your genre preferences',
      })),
      metadata: { rating_count: profile.rating_count, llm_fallback: true },
    };
  }

  // 5. Merge ranked IDs with full candidate data
  const candidateMap = Object.fromEntries(candidates.map(c => [c.id, c]));
  const recommendations = ranked
    .filter(r => candidateMap[r.id])
    .map(r => ({ ...candidateMap[r.id], because: r.because || 'Matches your taste profile' }))
    .slice(0, FINAL_COUNT);

  // Fill up if LLM returned fewer than expected
  if (recommendations.length < FINAL_COUNT) {
    const seen = new Set(recommendations.map(r => r.id));
    for (const c of candidates) {
      if (!seen.has(c.id) && recommendations.length < FINAL_COUNT) {
        recommendations.push({ ...c, because: 'Matches your genre preferences' });
      }
    }
  }

  const result = {
    recommendations,
    metadata: {
      profile_genres: Object.keys(profile.genre_scores || {}).length,
      ratings_count:  profile.rating_count,
      model:          MODEL,
    },
  };

  // Cache result
  if (!userQuery) {
    try { await redis.setex(cacheKey, AI_CACHE_TTL, JSON.stringify(result)); } catch (_) {}
  }

  return result;
}

module.exports = { getAIRecommendations };
