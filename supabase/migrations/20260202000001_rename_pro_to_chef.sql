-- Migration: Rename cooking_mode 'pro' to 'chef'
-- This avoids confusion with the "Pro" subscription tier

-- Step 1: Update existing 'pro' values to 'chef'
UPDATE user_preferences
SET cooking_mode = 'chef'
WHERE cooking_mode = 'pro';

-- Step 2: Drop old constraint and add new one with 'chef' instead of 'pro'
ALTER TABLE user_preferences
DROP CONSTRAINT IF EXISTS cooking_mode_check;

ALTER TABLE user_preferences
ADD CONSTRAINT cooking_mode_check
CHECK (cooking_mode IS NULL OR cooking_mode IN ('casual', 'chef'));
