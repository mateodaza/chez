-- Fix: Global knowledge (mode=NULL) should always be returned alongside mode-specific results
-- Previously: mode=NULL rows were excluded when filter_mode was provided
-- Now: mode=NULL rows are always included (they're universal cooking knowledge)

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
    -- Mode filter: include global knowledge (NULL) OR mode-specific matches
    AND (rk.mode IS NULL OR filter_mode IS NULL OR rk.mode = filter_mode)
    AND (filter_skill IS NULL OR rk.skill_level = filter_skill)
    AND (filter_doc_types IS NULL OR rk.doc_type = ANY(filter_doc_types))
  ORDER BY rk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
