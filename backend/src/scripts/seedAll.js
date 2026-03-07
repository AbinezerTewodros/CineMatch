/**
 * seedAll.js — Comprehensive media seeder
 * Seeds movies, TV shows, and anime from TMDB into the local database.
 *
 * Usage:  node src/scripts/seedAll.js
 * Env:    TMDB_API_KEY, DATABASE_URL must be set in .env
 */

require('dotenv').config();
const pool = require('../config/db');
const {
  getAllGenres,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getPopularTvShows,
  getTopRatedTvShows,
  getOnAirTvShows,
  discoverMovies,
  discoverTv,
} = require('../services/tmdb');

// Rate-limit guard: wait between TMDB requests
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── DB HELPERS ───────────────────────────────────────────────────────────────

async function upsertGenres(genres) {
  for (const g of genres) {
    await pool.query(
      'INSERT INTO genres (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2',
      [g.id, g.name]
    );
  }
  console.log(`  ✓ Genres: ${genres.length} upserted`);
}

async function upsertMedia(items, mediaType) {
  let count = 0;
  for (const item of items) {
    // Normalize TV show fields to match movie schema
    const title       = item.title       || item.name        || 'Untitled';
    const releaseDate = item.release_date || item.first_air_date || null;
    const genreIds    = item.genre_ids   || [];

    try {
      await pool.query(
        `INSERT INTO movies
           (id, title, overview, poster_path, backdrop_path, release_date,
            vote_average, vote_count, popularity, language, adult, media_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO UPDATE SET
           title        = EXCLUDED.title,
           popularity   = EXCLUDED.popularity,
           vote_average = EXCLUDED.vote_average,
           media_type   = EXCLUDED.media_type`,
        [
          item.id, title, item.overview || '',
          item.poster_path, item.backdrop_path,
          releaseDate || null,
          item.vote_average || 0, item.vote_count || 0,
          item.popularity || 0,
          item.original_language || item.language || 'en',
          item.adult || false,
          mediaType,
        ]
      );

      // Link genres
      for (const gId of genreIds) {
        await pool.query(
          'INSERT INTO movie_genres (movie_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [item.id, gId]
        );
      }
      count++;
    } catch (err) {
      // Skip any item that fails (e.g. a genre_id not in our genres table)
      if (process.env.SEED_DEBUG) console.warn(`  ⚠ Skip ${item.id}: ${err.message}`);
    }
  }
  return count;
}

// ─── BATCH FETCHER ────────────────────────────────────────────────────────────

async function fetchPages(fetchFn, pages, label) {
  const all = [];
  for (let p = 1; p <= pages; p++) {
    try {
      const items = await fetchFn(p);
      all.push(...items);
      process.stdout.write(`\r  Fetching ${label}: page ${p}/${pages} (${all.length} items)`);
      await sleep(200); // respect rate limits
    } catch (err) {
      console.warn(`\n  ⚠ Failed on page ${p}: ${err.message}`);
    }
  }
  console.log(); // newline after progress
  return all;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   CineMatch — Full Content Seeder        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const MOVIE_PAGES = 10;  // 10 pages × 20 = 200 movies per source
  const TV_PAGES    = 10;  // 10 pages × 20 = 200 shows per source
  const ANIME_PAGES = 5;   // 5 pages × 20 = 100 anime items per source

  let total = 0;

  // ── Step 1: Genres ──────────────────────────────────────────────────────────
  console.log('📂 Step 1/6: Seeding genres...');
  const genres = await getAllGenres();
  await upsertGenres(genres);

  // ── Step 2: Popular movies ───────────────────────────────────────────────────
  console.log('\n🎬 Step 2/6: Popular movies...');
  const popularMovies = await fetchPages(getPopularMovies, MOVIE_PAGES, 'Popular Movies');
  total += await upsertMedia(popularMovies, 'movie');
  console.log(`  ✓ ${total} movies in DB so far`);

  // ── Step 3: Top-rated movies ─────────────────────────────────────────────────
  console.log('\n⭐ Step 3/6: Top-rated movies...');
  const topRatedMovies = await fetchPages(getTopRatedMovies, MOVIE_PAGES, 'Top Rated Movies');
  const count3 = await upsertMedia(topRatedMovies, 'movie');
  total += count3;
  console.log(`  ✓ ${count3} new movies added (${total} total)`);

  // ── Step 4: Popular TV shows ─────────────────────────────────────────────────
  console.log('\n📺 Step 4/6: Popular TV shows...');
  const popularTv = await fetchPages(getPopularTvShows, TV_PAGES, 'Popular TV');
  const topRatedTv = await fetchPages(getTopRatedTvShows, TV_PAGES, 'Top Rated TV');
  const count4 = await upsertMedia([...popularTv, ...topRatedTv], 'tv');
  total += count4;
  console.log(`  ✓ ${count4} TV shows added (${total} total)`);

  // ── Step 5: Anime (Animation genre = 16) ────────────────────────────────────
  console.log('\n🎌 Step 5/6: Anime & Animation...');
  const animeMovies = await fetchPages(
    (p) => discoverMovies({ with_genres: 16, page: p }),
    ANIME_PAGES, 'Anime Movies'
  );
  const animeTv = await fetchPages(
    (p) => discoverTv({ with_genres: 16, page: p }),
    ANIME_PAGES, 'Anime TV'
  );
  const count5m = await upsertMedia(animeMovies, 'movie');
  const count5t = await upsertMedia(animeTv, 'tv');
  total += count5m + count5t;
  console.log(`  ✓ ${count5m + count5t} anime items added (${total} total)`);

  // ── Step 6: Now playing + on air (fresh content) ─────────────────────────────
  console.log('\n🆕 Step 6/6: Now playing & on-air...');
  const nowPlaying = await fetchPages(getNowPlayingMovies, 5, 'Now Playing');
  const onAir = await fetchPages(getOnAirTvShows, 5, 'On Air TV');
  const count6 = await upsertMedia([...nowPlaying, ...onAir], null); // media_type already set in items
  // Fix: re-seed with correct types
  await upsertMedia(nowPlaying, 'movie');
  await upsertMedia(onAir, 'tv');
  total += await pool.query('SELECT COUNT(*) FROM movies').then(r => 0); // just for log

  // ── Done ─────────────────────────────────────────────────────────────────────
  const finalCount = await pool.query('SELECT COUNT(*) as count, media_type FROM movies GROUP BY media_type');
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Seeding Complete!                      ║');
  console.log('╚══════════════════════════════════════════╝');
  finalCount.rows.forEach(r => {
    console.log(`  ${r.media_type === 'tv' ? '📺' : '🎬'} ${r.media_type.toUpperCase()}: ${r.count} items`);
  });

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message);
  process.exit(1);
});
