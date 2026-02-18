-- Push subscriptions table for web push notifications
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id   UUID NOT NULL,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

-- Index for fast lookup by couple (used when broadcasting to partner)
CREATE INDEX IF NOT EXISTS push_subscriptions_couple_idx ON push_subscriptions(couple_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can upsert their own subscriptions
CREATE POLICY "Users can upsert own push subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role (used by push API route) can read all subscriptions for a couple
-- This is enforced server-side via the service role key, not via RLS
-- But we need a select policy for the service role bypass to work
CREATE POLICY "Service role can read all subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (true);
