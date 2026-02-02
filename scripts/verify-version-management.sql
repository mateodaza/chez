-- Version Management Verification Queries
-- Run these to verify the bug fixes are working correctly

-- ============================================
-- SCHEMA ASSERTIONS
-- ============================================

-- 1. Verify forked_from_id column exists with index
SELECT '1. Fork tracking schema' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'master_recipes'
      AND column_name = 'forked_from_id'
    ) AND EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'idx_master_recipes_forked_from'
    ) THEN 'PASS: forked_from_id column and index exist'
    ELSE 'FAIL: forked_from_id column or index missing'
  END as result;

-- 2. Verify unique constraint on (master_recipe_id, version_number)
SELECT '2. Version uniqueness constraint' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'unique_recipe_version_number'
    ) THEN 'PASS: unique_recipe_version_number constraint exists'
    ELSE 'FAIL: unique_recipe_version_number constraint missing'
  END as result;

-- 3. Verify 'fork' is allowed in created_from_mode
SELECT '3. Fork mode in check constraint' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'master_recipe_versions_created_from_mode_check'
      AND pg_get_constraintdef(oid) LIKE '%fork%'
    ) THEN 'PASS: fork is allowed in created_from_mode'
    ELSE 'FAIL: fork not in created_from_mode check constraint'
  END as result;

-- ============================================
-- DATA INTEGRITY ASSERTIONS
-- ============================================

-- 4. Outsourced recipe has exactly 2 versions
SELECT '4. Outsourced recipe version count' as test_name,
  CASE
    WHEN (
      SELECT COUNT(*) FROM master_recipe_versions
      WHERE master_recipe_id = '7b02129c-71fb-40c0-987b-b78701175baf'
    ) = 2 THEN 'PASS: Outsourced recipe has exactly 2 versions'
    ELSE 'FAIL: Outsourced recipe should have exactly 2 versions'
  END as result;

-- 5. Outsourced recipe has exactly 2 sources
SELECT '5. Outsourced recipe source count' as test_name,
  CASE
    WHEN (
      SELECT COUNT(*) FROM recipe_source_links
      WHERE master_recipe_id = '7b02129c-71fb-40c0-987b-b78701175baf'
    ) = 2 THEN 'PASS: Outsourced recipe has exactly 2 sources'
    ELSE 'FAIL: Outsourced recipe should have exactly 2 sources'
  END as result;

-- 6. Forked recipe has exactly 1 version (no v2 should ever be created)
SELECT '6. Forked recipe version count' as test_name,
  CASE
    WHEN (
      SELECT COUNT(*) FROM master_recipe_versions
      WHERE master_recipe_id = '047baf21-ec9c-4e1f-881c-fe01b6ce23dd'
    ) = 1 THEN 'PASS: Forked recipe has exactly 1 version'
    ELSE 'FAIL: Forked recipe should have exactly 1 version (no v2!)'
  END as result;

-- 7. Forked recipe has forked_from_id set
SELECT '7. Forked recipe has forked_from_id' as test_name,
  CASE
    WHEN (
      SELECT forked_from_id FROM master_recipes
      WHERE id = '047baf21-ec9c-4e1f-881c-fe01b6ce23dd'
    ) IS NOT NULL THEN 'PASS: Forked recipe has forked_from_id set'
    ELSE 'FAIL: Forked recipe should have forked_from_id'
  END as result;

-- 8. Forked recipe has 0 source links
SELECT '8. Forked recipe has no sources' as test_name,
  CASE
    WHEN (
      SELECT COUNT(*) FROM recipe_source_links
      WHERE master_recipe_id = '047baf21-ec9c-4e1f-881c-fe01b6ce23dd'
    ) = 0 THEN 'PASS: Forked recipe has no source links'
    ELSE 'FAIL: Forked recipes should not have source links'
  END as result;

-- 9. Outsourced recipe current_version_id points to v2
SELECT '9. Current version is My Version (v2)' as test_name,
  CASE
    WHEN (
      SELECT mrv.version_number
      FROM master_recipes mr
      JOIN master_recipe_versions mrv ON mrv.id = mr.current_version_id
      WHERE mr.id = '7b02129c-71fb-40c0-987b-b78701175baf'
    ) = 2 THEN 'PASS: current_version_id points to v2 (My Version)'
    ELSE 'FAIL: current_version_id should point to v2'
  END as result;

-- 10. v2 parent_version_id points to v1
SELECT '10. v2 parent is v1' as test_name,
  CASE
    WHEN (
      SELECT parent_version_id FROM master_recipe_versions
      WHERE master_recipe_id = '7b02129c-71fb-40c0-987b-b78701175baf'
      AND version_number = 2
    ) = (
      SELECT id FROM master_recipe_versions
      WHERE master_recipe_id = '7b02129c-71fb-40c0-987b-b78701175baf'
      AND version_number = 1
    ) THEN 'PASS: v2 parent_version_id points to v1'
    ELSE 'FAIL: v2 should have v1 as parent'
  END as result;

-- ============================================
-- VERSION DETAILS
-- ============================================

-- Show version details for outsourced recipe
SELECT
  '--- Outsourced Recipe Versions ---' as info,
  mrv.version_number,
  mrv.id as version_id,
  mrv.created_from_mode,
  mrv.created_from_title,
  mrv.based_on_source_id,
  mrv.parent_version_id,
  jsonb_array_length(mrv.ingredients) as ingredient_count,
  jsonb_array_length(mrv.steps) as step_count
FROM master_recipe_versions mrv
WHERE mrv.master_recipe_id = '7b02129c-71fb-40c0-987b-b78701175baf'
ORDER BY mrv.version_number;

-- Show version details for forked recipe
SELECT
  '--- Forked Recipe Version ---' as info,
  mrv.version_number,
  mrv.id as version_id,
  mrv.created_from_mode,
  mrv.created_from_title,
  mrv.based_on_source_id,
  mrv.parent_version_id
FROM master_recipe_versions mrv
WHERE mrv.master_recipe_id = '047baf21-ec9c-4e1f-881c-fe01b6ce23dd';

-- ============================================
-- TEST IDS FOR MANUAL QA
-- ============================================
SELECT
  '=== TEST IDS FOR MANUAL QA ===' as info,
  '7b02129c-71fb-40c0-987b-b78701175baf' as outsourced_recipe_id,
  'f4e3c685-7d76-4154-9c0f-632b06c62706' as outsourced_v1_id,
  '0b814ed1-d665-44b8-82d3-780f060ffda9' as outsourced_v2_id,
  '047baf21-ec9c-4e1f-881c-fe01b6ce23dd' as forked_recipe_id,
  '2f85ebc2-1ebc-497d-a814-53b10bdb8e7d' as forked_v1_id;
