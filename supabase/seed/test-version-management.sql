-- Test Data Seed for Version Management Testing
-- Run this against your local Supabase instance to set up test scenarios
-- Usage: supabase db reset && psql -f supabase/seed/test-version-management.sql

-- Note: Replace USER_ID with an actual user ID from your auth.users table
-- You can get this by running: SELECT id FROM auth.users LIMIT 1;

DO $$
DECLARE
  test_user_id uuid;
  outsourced_recipe_id uuid := gen_random_uuid();
  forked_recipe_id uuid := gen_random_uuid();
  parent_recipe_id uuid := gen_random_uuid(); -- The recipe that forked_recipe is forked from
  outsourced_v1_id uuid := gen_random_uuid();
  outsourced_v2_id uuid := gen_random_uuid();
  forked_v1_id uuid := gen_random_uuid();
  parent_v1_id uuid := gen_random_uuid();
  source_1_id uuid := gen_random_uuid();
  source_2_id uuid := gen_random_uuid();
  video_source_1_id uuid := gen_random_uuid();
  video_source_2_id uuid := gen_random_uuid();
BEGIN
  -- Get first user from auth.users
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in auth.users. Please create a test user first.';
  END IF;

  RAISE NOTICE 'Using test user: %', test_user_id;

  -- ============================================
  -- 1. PARENT RECIPE (for forking)
  -- ============================================
  INSERT INTO master_recipes (
    id, user_id, title, description, mode, cuisine, category, status, current_version_id
  ) VALUES (
    parent_recipe_id,
    test_user_id,
    'Parent Carbonara (Original)',
    'The original recipe that will be forked',
    'video',
    'Italian',
    'Main Course',
    'cooked',
    NULL -- Will update after version creation
  );

  INSERT INTO master_recipe_versions (
    id, master_recipe_id, version_number, title, description, mode, cuisine, category,
    prep_time_minutes, cook_time_minutes, servings, ingredients, steps,
    created_from_mode, created_from_title
  ) VALUES (
    parent_v1_id,
    parent_recipe_id,
    1,
    'Parent Carbonara (Original)',
    'The original recipe that will be forked',
    'video',
    'Italian',
    'Main Course',
    15, 20, 4,
    '[
      {"id": "parent-ing-1", "item": "spaghetti", "quantity": 400, "unit": "g", "preparation": null, "is_optional": false, "sort_order": 0},
      {"id": "parent-ing-2", "item": "guanciale", "quantity": 200, "unit": "g", "preparation": "diced", "is_optional": false, "sort_order": 1},
      {"id": "parent-ing-3", "item": "egg yolks", "quantity": 4, "unit": null, "preparation": null, "is_optional": false, "sort_order": 2}
    ]'::jsonb,
    '[
      {"id": "parent-step-1", "step_number": 1, "instruction": "Boil water and cook pasta", "duration_minutes": 10},
      {"id": "parent-step-2", "step_number": 2, "instruction": "Fry guanciale until crispy", "duration_minutes": 8},
      {"id": "parent-step-3", "step_number": 3, "instruction": "Mix egg yolks with pecorino", "duration_minutes": 2}
    ]'::jsonb,
    'import',
    'Original Import'
  );

  UPDATE master_recipes SET current_version_id = parent_v1_id WHERE id = parent_recipe_id;

  -- ============================================
  -- 2. OUTSOURCED RECIPE (v1 + v2, 2 sources)
  -- ============================================

  -- Create video sources first
  INSERT INTO video_sources (
    id, user_id, source_url, source_platform, source_creator, source_thumbnail_url, status
  ) VALUES
  (
    video_source_1_id,
    test_user_id,
    'https://youtube.com/watch?v=test-carbonara-1',
    'youtube',
    'Chef John',
    'https://i.ytimg.com/vi/test1/hqdefault.jpg',
    'linked'
  ),
  (
    video_source_2_id,
    test_user_id,
    'https://tiktok.com/@chef2/video/test-carbonara-2',
    'tiktok',
    'Chef Maria',
    'https://tiktok.com/thumb2.jpg',
    'linked'
  );

  -- Create master recipe
  INSERT INTO master_recipes (
    id, user_id, title, description, mode, cuisine, category,
    status, cover_video_source_id, current_version_id
  ) VALUES (
    outsourced_recipe_id,
    test_user_id,
    'Test Outsourced Carbonara',
    'A carbonara recipe with multiple sources for version testing',
    'video',
    'Italian',
    'Main Course',
    'saved',
    video_source_1_id,
    NULL -- Will update after v2 creation
  );

  -- Create Original version (v1)
  INSERT INTO master_recipe_versions (
    id, master_recipe_id, version_number, title, description, mode, cuisine, category,
    prep_time_minutes, cook_time_minutes, servings, ingredients, steps,
    based_on_source_id, created_from_mode, created_from_title
  ) VALUES (
    outsourced_v1_id,
    outsourced_recipe_id,
    1,
    'Test Outsourced Carbonara',
    'A carbonara recipe with multiple sources for version testing',
    'video',
    'Italian',
    'Main Course',
    15, 20, 4,
    '[
      {"id": "out-ing-1", "item": "spaghetti", "quantity": 400, "unit": "g", "preparation": null, "is_optional": false, "sort_order": 0},
      {"id": "out-ing-2", "item": "guanciale", "quantity": 200, "unit": "g", "preparation": "diced", "is_optional": false, "sort_order": 1},
      {"id": "out-ing-3", "item": "egg yolks", "quantity": 4, "unit": null, "preparation": null, "is_optional": false, "sort_order": 2},
      {"id": "out-ing-4", "item": "pecorino romano", "quantity": 100, "unit": "g", "preparation": "finely grated", "is_optional": false, "sort_order": 3},
      {"id": "out-ing-5", "item": "black pepper", "quantity": null, "unit": "to taste", "preparation": "freshly ground", "is_optional": false, "sort_order": 4}
    ]'::jsonb,
    '[
      {"id": "out-step-1", "step_number": 1, "instruction": "Bring a large pot of salted water to boil. Cook spaghetti until al dente.", "duration_minutes": 10, "timer_label": "Pasta"},
      {"id": "out-step-2", "step_number": 2, "instruction": "While pasta cooks, cut guanciale into small cubes and fry in a cold pan until crispy.", "duration_minutes": 8, "timer_label": "Guanciale"},
      {"id": "out-step-3", "step_number": 3, "instruction": "In a bowl, whisk egg yolks with grated pecorino and black pepper.", "duration_minutes": 2},
      {"id": "out-step-4", "step_number": 4, "instruction": "Reserve 1 cup pasta water, drain pasta, and add to guanciale pan off heat.", "duration_minutes": 1},
      {"id": "out-step-5", "step_number": 5, "instruction": "Pour egg mixture over pasta, tossing quickly. Add pasta water as needed for creaminess.", "duration_minutes": 2}
    ]'::jsonb,
    NULL, -- Will link to source_1 after creation
    'import',
    'Original Import from Chef John'
  );

  -- Create My Version (v2) with modifications
  INSERT INTO master_recipe_versions (
    id, master_recipe_id, version_number, title, description, mode, cuisine, category,
    prep_time_minutes, cook_time_minutes, servings, ingredients, steps,
    parent_version_id, based_on_source_id, created_from_mode, created_from_title, change_notes
  ) VALUES (
    outsourced_v2_id,
    outsourced_recipe_id,
    2,
    'Test Outsourced Carbonara',
    'A carbonara recipe with multiple sources for version testing',
    'video',
    'Italian',
    'Main Course',
    15, 25, 4, -- Note: cook_time increased to 25
    '[
      {"id": "out-v2-ing-1", "item": "spaghetti", "quantity": 400, "unit": "g", "preparation": null, "is_optional": false, "sort_order": 0},
      {"id": "out-v2-ing-2", "item": "pancetta", "quantity": 200, "unit": "g", "preparation": "diced", "is_optional": false, "sort_order": 1, "original_text": "Originally: guanciale"},
      {"id": "out-v2-ing-3", "item": "egg yolks", "quantity": 4, "unit": null, "preparation": null, "is_optional": false, "sort_order": 2},
      {"id": "out-v2-ing-4", "item": "pecorino romano", "quantity": 100, "unit": "g", "preparation": "finely grated", "is_optional": false, "sort_order": 3},
      {"id": "out-v2-ing-5", "item": "black pepper", "quantity": null, "unit": "to taste", "preparation": "freshly ground", "is_optional": false, "sort_order": 4},
      {"id": "out-v2-ing-6", "item": "extra garlic", "quantity": 2, "unit": "cloves", "preparation": "minced", "is_optional": false, "sort_order": 5, "original_text": "Added based on your cooking session"}
    ]'::jsonb,
    '[
      {"id": "out-v2-step-1", "step_number": 1, "instruction": "Bring a large pot of salted water to boil. Cook spaghetti until al dente.", "duration_minutes": 10, "timer_label": "Pasta"},
      {"id": "out-v2-step-2", "step_number": 2, "instruction": "While pasta cooks, cut pancetta into small cubes and fry in a cold pan until crispy. Add minced garlic in last 30 seconds.", "duration_minutes": 10, "timer_label": "Pancetta"},
      {"id": "out-v2-step-3", "step_number": 3, "instruction": "In a bowl, whisk egg yolks with grated pecorino and black pepper.", "duration_minutes": 2},
      {"id": "out-v2-step-4", "step_number": 4, "instruction": "Reserve 1 cup pasta water, drain pasta, and add to pancetta pan off heat.", "duration_minutes": 1},
      {"id": "out-v2-step-5", "step_number": 5, "instruction": "Pour egg mixture over pasta, tossing quickly. Add pasta water as needed for creaminess.", "duration_minutes": 2}
    ]'::jsonb,
    outsourced_v1_id,
    NULL, -- Will link to source_1 after creation
    'cook_session',
    'Used pancetta, added garlic',
    'Updated from cooking session:
Uses pancetta instead of guanciale
Added extra garlic
Cooked pancetta longer for crispiness'
  );

  -- Update master recipe to point to v2 (My Version)
  UPDATE master_recipes SET current_version_id = outsourced_v2_id WHERE id = outsourced_recipe_id;

  -- Create source links (2 sources for the outsourced recipe)
  INSERT INTO recipe_source_links (
    id, master_recipe_id, video_source_id, link_status,
    extracted_ingredients, extracted_steps
  ) VALUES
  (
    source_1_id,
    outsourced_recipe_id,
    video_source_1_id,
    'linked',
    '[
      {"id": "src1-ing-1", "item": "spaghetti", "quantity": 400, "unit": "g"},
      {"id": "src1-ing-2", "item": "guanciale", "quantity": 200, "unit": "g", "preparation": "diced"},
      {"id": "src1-ing-3", "item": "egg yolks", "quantity": 4},
      {"id": "src1-ing-4", "item": "pecorino romano", "quantity": 100, "unit": "g"}
    ]'::jsonb,
    '[
      {"id": "src1-step-1", "step_number": 1, "instruction": "Cook pasta al dente", "duration_minutes": 10},
      {"id": "src1-step-2", "step_number": 2, "instruction": "Fry guanciale until crispy", "duration_minutes": 8},
      {"id": "src1-step-3", "step_number": 3, "instruction": "Mix eggs with cheese", "duration_minutes": 2},
      {"id": "src1-step-4", "step_number": 4, "instruction": "Combine all ingredients off heat", "duration_minutes": 2}
    ]'::jsonb
  ),
  (
    source_2_id,
    outsourced_recipe_id,
    video_source_2_id,
    'linked',
    '[
      {"id": "src2-ing-1", "item": "rigatoni", "quantity": 500, "unit": "g"},
      {"id": "src2-ing-2", "item": "bacon", "quantity": 250, "unit": "g", "preparation": "sliced"},
      {"id": "src2-ing-3", "item": "whole eggs", "quantity": 3},
      {"id": "src2-ing-4", "item": "parmesan", "quantity": 150, "unit": "g"}
    ]'::jsonb,
    '[
      {"id": "src2-step-1", "step_number": 1, "instruction": "Boil rigatoni until almost done", "duration_minutes": 12},
      {"id": "src2-step-2", "step_number": 2, "instruction": "Render bacon slowly", "duration_minutes": 15},
      {"id": "src2-step-3", "step_number": 3, "instruction": "Beat eggs with parmesan", "duration_minutes": 3},
      {"id": "src2-step-4", "step_number": 4, "instruction": "Finish pasta in pan with sauce", "duration_minutes": 3}
    ]'::jsonb
  );

  -- Update versions to reference source_1
  UPDATE master_recipe_versions
  SET based_on_source_id = source_1_id
  WHERE id IN (outsourced_v1_id, outsourced_v2_id);

  -- ============================================
  -- 3. FORKED RECIPE (only v1, forked_from_id set)
  -- ============================================
  INSERT INTO master_recipes (
    id, user_id, title, description, mode, cuisine, category,
    status, forked_from_id, current_version_id
  ) VALUES (
    forked_recipe_id,
    test_user_id,
    'My Carbonara Copy',
    'Forked from Parent Carbonara - my personal version',
    'video',
    'Italian',
    'Main Course',
    'saved',
    parent_recipe_id, -- FORKED FROM the parent recipe
    NULL -- Will update after version creation
  );

  -- Create only v1 for forked recipe (should NEVER have v2)
  INSERT INTO master_recipe_versions (
    id, master_recipe_id, version_number, title, description, mode, cuisine, category,
    prep_time_minutes, cook_time_minutes, servings, ingredients, steps,
    created_from_mode, created_from_title
  ) VALUES (
    forked_v1_id,
    forked_recipe_id,
    1,
    'My Carbonara Copy',
    'Forked from Parent Carbonara - my personal version',
    'video',
    'Italian',
    'Main Course',
    15, 20, 4,
    '[
      {"id": "fork-ing-1", "item": "spaghetti", "quantity": 400, "unit": "g", "preparation": null, "is_optional": false, "sort_order": 0},
      {"id": "fork-ing-2", "item": "guanciale", "quantity": 200, "unit": "g", "preparation": "diced", "is_optional": false, "sort_order": 1},
      {"id": "fork-ing-3", "item": "egg yolks", "quantity": 4, "unit": null, "preparation": null, "is_optional": false, "sort_order": 2},
      {"id": "fork-ing-4", "item": "pecorino romano", "quantity": 100, "unit": "g", "preparation": "finely grated", "is_optional": false, "sort_order": 3}
    ]'::jsonb,
    '[
      {"id": "fork-step-1", "step_number": 1, "instruction": "Boil water and cook pasta until al dente", "duration_minutes": 10},
      {"id": "fork-step-2", "step_number": 2, "instruction": "Fry guanciale until crispy", "duration_minutes": 8},
      {"id": "fork-step-3", "step_number": 3, "instruction": "Mix egg yolks with grated pecorino", "duration_minutes": 2},
      {"id": "fork-step-4", "step_number": 4, "instruction": "Combine pasta with guanciale, then add egg mixture off heat", "duration_minutes": 2}
    ]'::jsonb,
    'fork',
    'Forked from Parent Carbonara (Original)'
  );

  -- Update forked recipe to point to its only version
  UPDATE master_recipes SET current_version_id = forked_v1_id WHERE id = forked_recipe_id;

  -- ============================================
  -- Output test data IDs for reference
  -- ============================================
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST DATA CREATED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'OUTSOURCED RECIPE (v1 + v2, 2 sources):';
  RAISE NOTICE '  Recipe ID: %', outsourced_recipe_id;
  RAISE NOTICE '  Version 1 (Original) ID: %', outsourced_v1_id;
  RAISE NOTICE '  Version 2 (My Version) ID: %', outsourced_v2_id;
  RAISE NOTICE '  Source 1 (Chef John) ID: %', source_1_id;
  RAISE NOTICE '  Source 2 (Chef Maria) ID: %', source_2_id;
  RAISE NOTICE '';
  RAISE NOTICE 'FORKED RECIPE (only v1):';
  RAISE NOTICE '  Recipe ID: %', forked_recipe_id;
  RAISE NOTICE '  Version 1 ID: %', forked_v1_id;
  RAISE NOTICE '  Forked from: %', parent_recipe_id;
  RAISE NOTICE '';
  RAISE NOTICE 'PARENT RECIPE:';
  RAISE NOTICE '  Recipe ID: %', parent_recipe_id;
  RAISE NOTICE '  Version 1 ID: %', parent_v1_id;
  RAISE NOTICE '============================================';

END $$;
