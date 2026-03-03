const express = require('express');
const { getChatResponse } = require('../services/chatbot');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// @route   POST /api/chat
// @desc    Send message and get AI response
router.post('/', authMiddleware, async (req, res, next) => {
  const { message, sessionId = crypto.randomUUID() } = req.body;
  const userId = req.user.id; // Now guaranteed by middleware

  try {
    // 1. Fetch History if session exists
    const historyResult = await pool.query(
      'SELECT role, content FROM chat_logs WHERE session_id = $1 ORDER BY created_at ASC LIMIT 10',
      [sessionId]
    );
    const history = historyResult.rows;

    // 2. Get AI Response
    const aiMessage = await getChatResponse(userId, message, history);

    // 3. Save to Logs
    await pool.query(
      'INSERT INTO chat_logs (user_id, session_id, role, content) VALUES ($1, $2, $3, $4)',
      [userId, sessionId, 'user', message]
    );
    await pool.query(
      'INSERT INTO chat_logs (user_id, session_id, role, content) VALUES ($1, $2, $3, $4)',
      [userId, sessionId, 'assistant', aiMessage]
    );

    res.json({ reply: aiMessage, sessionId });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/chat/history/:sessionId
// @desc    Get chat history for a session
router.get('/history/:sessionId', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT role, content, created_at FROM chat_logs WHERE session_id = $1 ORDER BY created_at ASC',
      [req.params.sessionId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
