-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cooking_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Recipes policies
CREATE POLICY "Users can manage own recipes" ON recipes
  FOR ALL USING (auth.uid() = user_id);

-- Recipe ingredients policies
CREATE POLICY "Users can manage own recipe ingredients" ON recipe_ingredients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- Recipe steps policies
CREATE POLICY "Users can manage own recipe steps" ON recipe_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_steps.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- Cook sessions policies
CREATE POLICY "Users can manage own cook sessions" ON cook_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Cook session messages policies
CREATE POLICY "Users can manage own session messages" ON cook_session_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cook_sessions
      WHERE cook_sessions.id = cook_session_messages.session_id
      AND cook_sessions.user_id = auth.uid()
    )
  );

-- Grocery lists policies
CREATE POLICY "Users can manage own grocery lists" ON grocery_lists
  FOR ALL USING (auth.uid() = user_id);

-- Grocery items policies
CREATE POLICY "Users can manage own grocery items" ON grocery_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM grocery_lists
      WHERE grocery_lists.id = grocery_items.grocery_list_id
      AND grocery_lists.user_id = auth.uid()
    )
  );

-- Recipe knowledge policies (global, read-only for all)
CREATE POLICY "Anyone can read recipe knowledge" ON recipe_knowledge
  FOR SELECT USING (true);

-- User cooking memory policies
CREATE POLICY "Users can manage own cooking memory" ON user_cooking_memory
  FOR ALL USING (auth.uid() = user_id);

-- Extraction logs policies (service role only)
CREATE POLICY "Service role only for extraction logs" ON extraction_logs
  FOR ALL USING (false) WITH CHECK (false);
