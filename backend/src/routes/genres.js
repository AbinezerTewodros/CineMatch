const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// @route   GET /api/genres
// @desc    Get all genres
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM genres ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
