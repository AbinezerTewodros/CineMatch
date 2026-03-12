require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const authRoutes            = require('./routes/auth');
const genreRoutes           = require('./routes/genres');
const movieRoutes           = require('./routes/movies');
const mediaRoutes           = require('./routes/media');
const personRoutes          = require('./routes/person');
const ratingRoutes          = require('./routes/ratings');
const watchlistRoutes       = require('./routes/watchlist');
const preferenceRoutes      = require('./routes/preferences');
const recommendationRoutes  = require('./routes/recommendations');
const chatRoutes            = require('./routes/chat');
const onboardingRoutes      = require('./routes/onboarding');
const aiRoutes              = require('./routes/aiRecommendations');
const adminRoutes           = require('./routes/admin');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL          // e.g. https://cinematch.vercel.app
    : 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/person', personRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
