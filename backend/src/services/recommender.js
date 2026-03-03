const pool = require('../config/db');
const redis = require('../config/redis');

/**
 * Phase 1 Recommendation Logic:
 * 1. Get user preferences (genres, min_rating)
 * 2. Get user's high-rated movies (rating >= 7)
 * 3. Extract genres from high-rated movies
 * 4. Combine with preferred genres
 * 5. Query movies with those genres, filtered by min_rating
 * 6. Exclude already rated/watchlisted movies
 * 7. Order by popularity
 */
const getPersonalizedRecommendations = async (userId) => {
  const cacheKey = `recs:${userId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 1. Get preferences
  const prefResult = await pool.query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
  const prefs = prefResult.rows[0] || { preferred_genres: [], min_rating: 6.0 };

  // 2. Get high-rated movie genres
  const ratedGenresResult = await pool.query(
    `SELECT DISTINCT mg.genre_id 
     FROM user_ratings ur
     JOIN movie_genres mg ON ur.movie_id = mg.movie_id
     WHERE ur.user_id = $1 AND ur.rating >= 7`,
    [userId]
  );
  const ratedGenres = ratedGenresResult.rows.map(r => r.genre_id);

  // 3. Combine genres
  const allTargetGenres = [...new Set([...(prefs.preferred_genres || []), ...ratedGenres])];

  // 4. Build Query
  let query = `
    SELECT m.*, array_agg(g.name) as genres
    FROM movies m
    LEFT JOIN movie_genres mg ON m.id = mg.movie_id
    LEFT JOIN genres g ON mg.genre_id = g.id
    WHERE m.vote_average >= $1
  `;
  const params = [prefs.min_rating || 6.0];

  if (allTargetGenres.length > 0) {
    query += ` AND m.id IN (SELECT movie_id FROM movie_genres WHERE genre_id = ANY($2))`;
    params.push(allTargetGenres);
  }

  // Exclude seen movies
  query += ` 
    AND m.id NOT IN (SELECT movie_id FROM user_ratings WHERE user_id = $${params.length + 1})
    GROUP BY m.id
    ORDER BY m.popularity DESC
    LIMIT 20
  `;
  params.push(userId);

  const result = await pool.query(query, params);
  
  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(result.rows));

  return result.rows;
};

const getSimilarMovies = async (movieId) => {
  const result = await pool.query(
    `SELECT m.* FROM movies m
     JOIN movie_genres mg ON m.id = mg.movie_id
     WHERE mg.genre_id IN (SELECT genre_id FROM movie_genres WHERE movie_id = $1)
     AND m.id != $1
     GROUP BY m.id
     ORDER BY m.popularity DESC
     LIMIT 10`,
    [movieId]
  );
  return result.rows;
};

module.exports = {
  getPersonalizedRecommendations,
  getSimilarMovies,
};
