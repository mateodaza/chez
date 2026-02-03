-- Verification queries after testing cook-chat-v2 v4

-- 1. Check cost logs (should show model routing)
SELECT
  created_at,
  operation,
  model,
  provider,
  intent,
  prompt_tokens,
  completion_tokens,
  cost_usd,
  latency_ms
FROM ai_cost_logs
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check rate limit status
SELECT
  user_id,
  tier,
  daily_chat_messages,
  reset_date,
  updated_at
FROM user_rate_limits
WHERE user_id = '3a03079e-b93b-4379-951d-c998a168b379';

-- 3. Check learning persistence
SELECT
  id,
  content,
  memory_type,
  label,
  source_session_id,
  metadata->>'learning_type' as learning_type,
  metadata->>'modification' as modification,
  created_at
FROM user_cooking_memory
WHERE user_id = '3a03079e-b93b-4379-951d-c998a168b379'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check session detected_learnings array
SELECT
  id,
  detected_learnings,
  created_at
FROM cook_sessions
WHERE id = 'be635b97-1816-40fa-b5b7-5e13d25e19f1';

-- 5. Recent chat messages
SELECT
  created_at,
  role,
  content
FROM cook_session_messages
WHERE session_id = 'be635b97-1816-40fa-b5b7-5e13d25e19f1'
ORDER BY created_at DESC
LIMIT 10;
