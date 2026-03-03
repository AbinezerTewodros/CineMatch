const axios = require('axios');

const tmdb = axios.create({
  baseURL: process.env.TMDB_BASE_URL,
  params: {
    api_key: process.env.TMDB_API_KEY,
  },
});

/**
 * Fetch all movie genres from TMDB
 */
const getGenres = async () => {
  const response = await tmdb.get('/genre/movie/list');
  return response.data.genres;
};

/**
 * Fetch popular movies
 */
const getPopularMovies = async (page = 1) => {
  const response = await tmdb.get('/movie/popular', { params: { page } });
  return response.data.results;
};

/**
 * Fetch trending movies (day/week)
 */
const getTrendingMovies = async (timeWindow = 'day') => {
  const response = await tmdb.get(`/trending/movie/${timeWindow}`);
  return response.data.results;
};

/**
 * Get movie details
 */
const getMovieDetails = async (movieId) => {
  const response = await tmdb.get(`/movie/${movieId}`);
  return response.data;
};

/**
 * Search movies
 */
const searchMovies = async (query, page = 1) => {
  const response = await tmdb.get('/search/movie', { params: { query, page } });
  return response.data;
};

module.exports = {
  getGenres,
  getPopularMovies,
  getTrendingMovies,
  getMovieDetails,
  searchMovies,
};
