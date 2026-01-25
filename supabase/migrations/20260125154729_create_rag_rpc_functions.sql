-- RAG RPC functions for vector similarity search
-- These functions are used by cook-chat to retrieve relevant knowledge and user memories

-- Function to match recipe knowledge based on embedding similarity
CREATE OR REPLACE FUNCTION public.match_recipe_knowledge(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  filter_mode text DEFAULT NULL,
  filter_skill text DEFAULT NULL,
  filter_doc_types text[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  content text,
  metadata jsonb,
  doc_type text,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rk.id,
    rk.content,
    rk.metadata,
    rk.doc_type,
    1 - (rk.embedding <=> query_embedding) AS similarity
  FROM recipe_knowledge rk
  WHERE
    1 - (rk.embedding <=> query_embedding) > match_threshold
    AND (filter_mode IS NULL OR rk.mode = filter_mode)
    AND (filter_skill IS NULL OR rk.skill_level = filter_skill)
    AND (filter_doc_types IS NULL OR rk.doc_type = ANY(filter_doc_types))
  ORDER BY rk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to match user cooking memories based on embedding similarity
CREATE OR REPLACE FUNCTION public.match_user_memory(
  p_user_id uuid,
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  content text,
  metadata jsonb,
  memory_type text,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.id,
    um.content,
    um.metadata,
    um.memory_type,
    1 - (um.embedding <=> query_embedding) AS similarity
  FROM user_cooking_memory um
  WHERE
    um.user_id = p_user_id
    AND 1 - (um.embedding <=> query_embedding) > match_threshold
  ORDER BY um.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.match_recipe_knowledge TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_recipe_knowledge TO service_role;
GRANT EXECUTE ON FUNCTION public.match_user_memory TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_user_memory TO service_role;
