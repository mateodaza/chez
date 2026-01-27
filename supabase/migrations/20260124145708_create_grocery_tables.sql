-- Grocery lists table
CREATE TABLE grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  master_recipe_ids JSONB DEFAULT '[]'::jsonb,  -- Array of master_recipe UUIDs
  is_active BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grocery items table
CREATE TABLE grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grocery_list_id UUID REFERENCES grocery_lists(id),
  item TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  category TEXT,
  source_master_recipe_ids JSONB DEFAULT '[]'::jsonb,  -- Array of master_recipe UUIDs this item came from
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  is_manual BOOLEAN DEFAULT false,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
