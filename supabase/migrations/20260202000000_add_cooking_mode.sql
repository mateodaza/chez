-- Migration: Add cooking_mode column to user_preferences
--
-- IMPORTANT: Before running this migration, run the preflight cleanup in Supabase SQL editor:
-- DELETE FROM user_preferences WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);

-- Step 1: Add cooking_mode column (NULL allowed, app defaults to 'casual')
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS cooking_mode TEXT DEFAULT 'casual';

-- Step 2: Add check constraint for valid values (allows NULL)
-- Use DO block to make this idempotent (scoped to user_preferences table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cooking_mode_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE user_preferences
    ADD CONSTRAINT cooking_mode_check
    CHECK (cooking_mode IS NULL OR cooking_mode IN ('casual', 'pro'));
  END IF;
END $$;

-- Step 3: Change FK from users(id) to auth.users(id)
ALTER TABLE user_preferences
DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

ALTER TABLE user_preferences
ADD CONSTRAINT user_preferences_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 4: Fix RLS policy (drop existing, create new with WITH CHECK)
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
