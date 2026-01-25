-- NO-OP: RPC functions placeholder
--
-- This migration slot was reserved for RPC functions during initial schema design.
-- The actual RAG RPC functions (match_recipe_knowledge, match_user_memory) are
-- created in migration 20260125154729_create_rag_rpc_functions.sql
--
-- Kept for migration history compatibility - do not delete.
SELECT 1;
