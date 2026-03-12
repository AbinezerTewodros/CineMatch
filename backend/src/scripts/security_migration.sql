-- Security hardening migration
-- Run this in Supabase SQL editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin      BOOLEAN     DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned     BOOLEAN     DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT        DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count   INT         DEFAULT 0;

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin  ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
CREATE INDEX IF NOT EXISTS idx_users_created   ON users(created_at DESC);
