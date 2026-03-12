/**
 * Admin Routes — all protected by adminMiddleware
 * GET  /api/admin/stats
 * GET  /api/admin/users
 * PATCH /api/admin/users/:id/ban
 * PATCH /api/admin/users/:id/role
 * DELETE /api/admin/users/:id
 * GET  /api/admin/content
 * DELETE /api/admin/content/:id
 * GET  /api/admin/activity
 */
const express       = require('express');
const pool          = require('../config/db');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();
router.use(adminMiddleware);

// ── GET /api/admin/stats ───────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [
      users, movies, tvShows, ratings, watchlists,
      newToday, newWeek, activeWeek, bannedCount, adminCount,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM movies WHERE media_type = 'movie'"),
      pool.query("SELECT COUNT(*) FROM movies WHERE media_type = 'tv'"),
      pool.query('SELECT COUNT(*) FROM user_ratings'),
      pool.query('SELECT COUNT(*) FROM watchlist'),
      pool.query("SELECT COUNT(*) FROM users WHERE created_at >= now() - interval '1 day'"),
      pool.query("SELECT COUNT(*) FROM users WHERE created_at >= now() - interval '7 days'"),
      pool.query("SELECT COUNT(*) FROM users WHERE last_login_at >= now() - interval '7 days'"),
      pool.query('SELECT COUNT(*) FROM users WHERE is_banned = true'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_admin = true'),
    ]);

    // Signups per day for the last 7 days (for the sparkline)
    const signupTrend = await pool.query(`
      SELECT DATE(created_at) AS day, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= now() - interval '7 days'
      GROUP BY day ORDER BY day
    `);

    const ratingTrend = await pool.query(`
      SELECT DATE(created_at) AS day, COUNT(*)::int AS count
      FROM user_ratings
      WHERE created_at >= now() - interval '7 days'
      GROUP BY day ORDER BY day
    `);

    res.json({
      users:        Number(users.rows[0].count),
      movies:       Number(movies.rows[0].count),
      tv_shows:     Number(tvShows.rows[0].count),
      ratings:      Number(ratings.rows[0].count),
      watchlists:   Number(watchlists.rows[0].count),
      new_today:    Number(newToday.rows[0].count),
      new_week:     Number(newWeek.rows[0].count),
      active_week:  Number(activeWeek.rows[0].count),
      banned:       Number(bannedCount.rows[0].count),
      admins:       Number(adminCount.rows[0].count),
      signup_trend: signupTrend.rows,
      rating_trend: ratingTrend.rows,
    });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users ───────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  const { q = '', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  try {
    const search = `%${q.toLowerCase()}%`;
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.username, u.avatar_emoji, u.is_admin, u.is_banned,
              u.auth_provider, u.created_at, u.last_login_at, u.login_count,
              COUNT(DISTINCT ur.id) AS rating_count,
              COUNT(DISTINCT w.id)  AS watchlist_count
       FROM users u
       LEFT JOIN user_ratings ur ON ur.user_id = u.id
       LEFT JOIN watchlist     w  ON w.user_id  = u.id
       WHERE LOWER(u.username) LIKE $1 OR LOWER(u.email) LIKE $1
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [search, Number(limit), offset]
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM users
       WHERE LOWER(username) LIKE $1 OR LOWER(email) LIKE $1`,
      [search]
    );

    res.json({ users: rows, total: Number(total.rows[0].count), page: Number(page) });
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/users/:id/ban ────────────────────────────────────────────
router.patch('/users/:id/ban', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot ban yourself' });
    }
    const { rows } = await pool.query(
      `UPDATE users SET is_banned = NOT is_banned WHERE id = $1
       RETURNING id, username, is_banned`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/users/:id/role ───────────────────────────────────────────
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }
    const { rows } = await pool.query(
      `UPDATE users SET is_admin = NOT is_admin WHERE id = $1
       RETURNING id, username, is_admin`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/users/:id ────────────────────────────────────────────────
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account from admin panel' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) { next(err); }
});

// ── GET /api/admin/content ─────────────────────────────────────────────────────
router.get('/content', async (req, res, next) => {
  const { q = '', type = '', page = 1, limit = 24 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  try {
    const search = `%${q.toLowerCase()}%`;
    const params = [search, Number(limit), offset];
    let typeFilter = '';
    if (type === 'movie' || type === 'tv') {
      params.push(type);
      typeFilter = `AND m.media_type = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT m.id, m.title, m.media_type, m.poster_path, m.vote_average, m.release_date,
              COUNT(DISTINCT ur.id)::int AS rating_count,
              COUNT(DISTINCT w.id)::int  AS watchlist_count
       FROM movies m
       LEFT JOIN user_ratings ur ON ur.movie_id = m.id
       LEFT JOIN watchlist     w  ON w.movie_id  = m.id
       WHERE LOWER(m.title) LIKE $1
         ${typeFilter}
       GROUP BY m.id
       ORDER BY (COUNT(DISTINCT ur.id) + COUNT(DISTINCT w.id)) DESC, m.popularity DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    const total = await pool.query(
      `SELECT COUNT(*) FROM movies WHERE LOWER(title) LIKE $1${type ? ` AND media_type = '${type}'` : ''}`,
      [search]
    );

    res.json({ content: rows, total: Number(total.rows[0].count), page: Number(page) });
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/content/:id ─────────────────────────────────────────────
router.delete('/content/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM movies WHERE id = $1', [req.params.id]);
    res.json({ message: 'Content removed' });
  } catch (err) { next(err); }
});

// ── GET /api/admin/activity ────────────────────────────────────────────────────
router.get('/activity', async (req, res, next) => {
  try {
    const { rows: ratings } = await pool.query(
      `SELECT 'rating' AS type, u.username, u.avatar_emoji, m.title,
              ur.rating AS value, ur.created_at
       FROM user_ratings ur
       JOIN users u  ON u.id  = ur.user_id
       JOIN movies m ON m.id  = ur.movie_id
       ORDER BY ur.created_at DESC LIMIT 30`
    );

    const { rows: watchlistAdds } = await pool.query(
      `SELECT 'watchlist' AS type, u.username, u.avatar_emoji, m.title,
              NULL AS value, w.added_at AS created_at
       FROM watchlist w
       JOIN users u  ON u.id  = w.user_id
       JOIN movies m ON m.id  = w.movie_id
       ORDER BY w.added_at DESC LIMIT 20`
    );

    const activity = [...ratings, ...watchlistAdds]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 40);

    res.json(activity);
  } catch (err) { next(err); }
});

module.exports = router;
