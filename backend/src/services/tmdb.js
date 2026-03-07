const axios = require('axios');

const tmdb = axios.create({
  baseURL: process.env.TMDB_BASE_URL,
  params: {
    api_key: process.env.TMDB_API_KEY,
  },
});

// ─── GENRES ───────────────────────────────────────────────────────────────────

/** Movie genres */
const getMovieGenres = async () => {
  const res = await tmdb.get('/genre/movie/list');
  return res.data.genres;
};

/** TV genres */
const getTvGenres = async () => {
  const res = await tmdb.get('/genre/tv/list');
  return res.data.genres;
};

/** Combined unique genres from both movie + TV */
const getAllGenres = async () => {
  const [movieGenres, tvGenres] = await Promise.all([getMovieGenres(), getTvGenres()]);
  const map = new Map();
  [...movieGenres, ...tvGenres].forEach(g => map.set(g.id, g));
  return Array.from(map.values());
};

// Keep old name as alias for backward compat
const getGenres = getMovieGenres;

// ─── MOVIES ───────────────────────────────────────────────────────────────────

const getPopularMovies = async (page = 1) => {
  const res = await tmdb.get('/movie/popular', { params: { page } });
  return res.data.results;
};

const getTopRatedMovies = async (page = 1) => {
  const res = await tmdb.get('/movie/top_rated', { params: { page } });
  return res.data.results;
};

const getNowPlayingMovies = async (page = 1) => {
  const res = await tmdb.get('/movie/now_playing', { params: { page } });
  return res.data.results;
};

const getMovieDetails = async (movieId) => {
  const res = await tmdb.get(`/movie/${movieId}`, {
    params: { append_to_response: 'videos,credits' },
  });
  return res.data;
};

// ─── TV SHOWS ─────────────────────────────────────────────────────────────────

const getPopularTvShows = async (page = 1) => {
  const res = await tmdb.get('/tv/popular', { params: { page } });
  return res.data.results;
};

const getTopRatedTvShows = async (page = 1) => {
  const res = await tmdb.get('/tv/top_rated', { params: { page } });
  return res.data.results;
};

const getOnAirTvShows = async (page = 1) => {
  const res = await tmdb.get('/tv/on_the_air', { params: { page } });
  return res.data.results;
};

const getTvShowDetails = async (tvId) => {
  const res = await tmdb.get(`/tv/${tvId}`, {
    params: { append_to_response: 'videos,credits' },
  });
  return res.data;
};

// ─── TRENDING ─────────────────────────────────────────────────────────────────

/** Trending movies only */
const getTrendingMovies = async (timeWindow = 'week') => {
  const res = await tmdb.get(`/trending/movie/${timeWindow}`);
  return res.data.results;
};

/** Trending TV only */
const getTrendingTv = async (timeWindow = 'week') => {
  const res = await tmdb.get(`/trending/tv/${timeWindow}`);
  return res.data.results;
};

/** Trending everything (movies + TV mixed) */
const getTrendingAll = async (timeWindow = 'week') => {
  const res = await tmdb.get(`/trending/all/${timeWindow}`);
  return res.data.results;
};

// ─── DISCOVER ─────────────────────────────────────────────────────────────────

/**
 * Discover movies with flexible filters
 * @param {Object} params - e.g. { with_genres: 16, vote_average_gte: 7, page: 1 }
 */
const discoverMovies = async (params = {}) => {
  const res = await tmdb.get('/discover/movie', { params: { sort_by: 'popularity.desc', ...params } });
  return res.data.results;
};

/**
 * Discover TV shows with flexible filters
 * @param {Object} params - e.g. { with_genres: 16, vote_average_gte: 7, page: 1 }
 */
const discoverTv = async (params = {}) => {
  const res = await tmdb.get('/discover/tv', { params: { sort_by: 'popularity.desc', ...params } });
  return res.data.results;
};

// ─── SEARCH ───────────────────────────────────────────────────────────────────

/** Search movies only */
const searchMovies = async (query, page = 1) => {
  const res = await tmdb.get('/search/movie', { params: { query, page } });
  return res.data;
};

/** Search TV shows only */
const searchTv = async (query, page = 1) => {
  const res = await tmdb.get('/search/tv', { params: { query, page } });
  return res.data;
};

/**
 * Search everything at once (movies + TV + people)
 * Returns results with media_type field: 'movie' | 'tv' | 'person'
 */
const searchMulti = async (query, page = 1) => {
  const res = await tmdb.get('/search/multi', { params: { query, page } });
  return res.data.results.filter(r => r.media_type !== 'person'); // exclude people
};

module.exports = {
  // Genres
  getGenres,
  getMovieGenres,
  getTvGenres,
  getAllGenres,
  // Movies
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getMovieDetails,
  // TV Shows
  getPopularTvShows,
  getTopRatedTvShows,
  getOnAirTvShows,
  getTvShowDetails,
  // Trending
  getTrendingMovies,
  getTrendingTv,
  getTrendingAll,
  // Discover
  discoverMovies,
  discoverTv,
  // Search
  searchMovies,
  searchTv,
  searchMulti,
};
