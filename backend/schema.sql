-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Genres table
CREATE TABLE IF NOT EXISTS genres (
  id INT PRIMARY KEY, -- TMDB genre ID
  name TEXT NOT NULL
);

-- Movies / TV Shows table (unified media table)
CREATE TABLE IF NOT EXISTS movies (
  id INT PRIMARY KEY,          -- TMDB ID
  title TEXT NOT NULL,         -- movie title or TV show name
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date DATE,           -- movie release_date or TV first_air_date
  vote_average FLOAT,
  vote_count INT,
  popularity FLOAT,
  language TEXT,
  adult BOOLEAN,
  media_type TEXT DEFAULT 'movie', -- 'movie' | 'tv'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migration for existing databases: add media_type if not exists
ALTER TABLE movies ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'movie';

-- Movie Genres junction table
CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
  genre_id INT REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, genre_id)
);

-- User Ratings table
CREATE TABLE IF NOT EXISTS user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, movie_id)
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, movie_id)
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_genres INT[], -- Array of genre IDs
  preferred_languages TEXT[], -- e.g. ["en", "fr"]
  min_rating FLOAT DEFAULT 6.0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Logs table
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
