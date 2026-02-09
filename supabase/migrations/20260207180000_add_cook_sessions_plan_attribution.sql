-- Migration: Add plan attribution columns to cook_sessions
-- Purpose: Enable KPI queries to segment plan-started vs non-plan-started sessions
-- Affected table: cook_sessions

alter table public.cook_sessions
  add column if not exists started_from_plan boolean default false;

alter table public.cook_sessions
  add column if not exists planned_at timestamptz;

alter table public.cook_sessions
  add column if not exists planned_target_time timestamptz;

alter table public.cook_sessions
  add column if not exists planned_servings integer;

-- Add comment for documentation
comment on column public.cook_sessions.started_from_plan is 'Whether this session was started from a meal plan or challenge CTA';
comment on column public.cook_sessions.planned_at is 'When the user planned/scheduled this cook';
comment on column public.cook_sessions.planned_target_time is 'The target time the user planned to cook';
comment on column public.cook_sessions.planned_servings is 'The number of servings the user planned to make';
