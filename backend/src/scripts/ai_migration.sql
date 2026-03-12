-- ─── AI Recommendation Engine: Schema Migration ─────────────────────────────
-- Run this against your Supabase database

-- Search history tracking
CREATE TABLE IF NOT EXISTS search_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  result_clicked_id INT REFERENCES movies(id) ON DELETE SET NULL,
  searched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at DESC);

-- New user onboarding responses
CREATE TABLE IF NOT EXISTS onboarding_responses (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  completed            BOOLEAN DEFAULT false,
  mood_preference      TEXT[]    DEFAULT '{}',
  era_preference       TEXT[]    DEFAULT '{}',
  language_preference  TEXT[]    DEFAULT '{"en"}',
  seed_ratings         JSONB     DEFAULT '{}',
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Computed user taste profiles (auto-refreshed)
CREATE TABLE IF NOT EXISTS user_taste_profiles (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  genre_scores         JSONB  DEFAULT '{}',   -- {genre_id: 0-1 affinity}
  actor_affinities     JSONB  DEFAULT '{}',   -- {person_id: score}
  director_affinities  JSONB  DEFAULT '{}',
  era_scores           JSONB  DEFAULT '{}',   -- {pre1980,1980s,1990s,2000s,2010s,recent}
  avg_rating_given     FLOAT  DEFAULT 7.0,
  rating_count         INT    DEFAULT 0,
  last_updated         TIMESTAMPTZ DEFAULT now()
);

-- avatar_emoji column on users (if not already added)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '😊';
