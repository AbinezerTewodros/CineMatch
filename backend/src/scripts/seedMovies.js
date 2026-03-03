require('dotenv').config();
const pool = require('../config/db');
const { getGenres, getPopularMovies } = require('../services/tmdb');

const seed = async () => {
  try {
    console.log('--- Starting Seeding Process ---');

    // 1. Seed Genres
    console.log('Fetching genres from TMDB...');
    const genres = await getGenres();
    console.log(`Found ${genres.length} genres. Inserting into DB...`);

    for (const genre of genres) {
      await pool.query(
        'INSERT INTO genres (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name',
        [genre.id, genre.name]
      );
    }
    console.log('Genres seeded successfully.');

    // 2. Seed Initial Movies (top 3 pages of popular)
    console.log('Fetching popular movies from TMDB...');
    let movieCount = 0;
    for (let page = 1; page <= 3; page++) {
      const movies = await getPopularMovies(page);
      for (const movie of movies) {
        // Insert movie
        await pool.query(
          `INSERT INTO movies 
          (id, title, overview, poster_path, backdrop_path, release_date, vote_average, vote_count, popularity, language, adult) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
          ON CONFLICT (id) DO UPDATE SET 
            popularity = EXCLUDED.popularity, 
            vote_average = EXCLUDED.vote_average, 
            vote_count = EXCLUDED.vote_count`,
          [
            movie.id,
            movie.title,
            movie.overview,
            movie.poster_path,
            movie.backdrop_path,
            movie.release_date || null,
            movie.vote_average,
            movie.vote_count,
            movie.popularity,
            movie.original_language,
            movie.adult
          ]
        );

        // Insert movie_genres links
        if (movie.genre_ids && movie.genre_ids.length > 0) {
          for (const genreId of movie.genre_ids) {
            await pool.query(
              'INSERT INTO movie_genres (movie_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [movie.id, genreId]
            );
          }
        }
        movieCount++;
      }
    }

    console.log(`Seeded ${movieCount} movies successfully.`);
    console.log('--- Seeding Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
