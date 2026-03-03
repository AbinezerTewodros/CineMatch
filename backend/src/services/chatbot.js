const axios = require('axios');
const pool = require('../config/db');

const openRouter = axios.create({
  baseURL: process.env.OPENROUTER_BASE_URL,
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'X-Title': 'Movie Recommendation App',
    'Content-Type': 'application/json',
  },
});

/**
 * Search local DB for context based on message
 */
const getContextFromDB = async (message) => {
  // Simple keyword matching for context enrichment
  const words = message.toLowerCase().split(' ').filter(w => w.length > 3);
  if (words.length === 0) return '';

  const query = `
    SELECT title, overview, vote_average 
    FROM movies 
    WHERE title ILIKE ANY($1) OR overview ILIKE ANY($1)
    ORDER BY popularity DESC 
    LIMIT 5
  `;
  const patterns = words.map(w => `%${w}%`);
  
  try {
    const result = await pool.query(query, [patterns]);
    if (result.rows.length === 0) return '';

    return "\nHere are some relevant movies from our database:\n" + 
      result.rows.map(m => `- ${m.title}: ${m.overview} (Rating: ${m.vote_average})`).join('\n');
  } catch (err) {
    console.error('Context retrieval error:', err);
    return '';
  }
};

const getChatResponse = async (userId, message, history = []) => {
  const context = await getContextFromDB(message);

  const systemPrompt = `You are a helpful movie recommendation assistant. 
  You help users find movies based on their taste. 
  ${context ? `Use the following movie details to help with your recommendation: ${context}` : ''}
  Be concise, friendly, and knowledgeable about cinema.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10), // Send last 10 messages for context
    { role: 'user', content: message }
  ];

  try {
    const response = await openRouter.post('/chat/completions', {
      model: 'openrouter/free',
      messages,
    });

    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
      console.error('OpenRouter Invalid Response:', response.data);
      throw new Error('AI returned an empty response');
    }

    return response.data.choices[0].message.content;
  } catch (err) {
    const errorDetails = err.response?.data || err.message;
    console.error('--- OpenRouter API Error ---');
    console.error('Status:', err.response?.status);
    console.error('Error Details:', JSON.stringify(errorDetails, null, 2));
    
    // Check if it's a model not found or credit issue
    if (err.response?.status === 404 || err.response?.status === 402) {
      console.warn('Primary model failed, might be unavailable or credits exhausted. Check .env key!');
    }

    throw new Error(`AI service error: ${err.response?.status || 'Unknown'}`);
  }
};

module.exports = {
  getChatResponse,
};
