export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      ai_cost_logs: {
        Row: {
          completion_tokens: number | null;
          cost_usd: number;
          created_at: string | null;
          id: string;
          intent: string | null;
          latency_ms: number | null;
          model: string;
          operation: string;
          prompt_tokens: number | null;
          provider: string;
          session_id: string | null;
          user_id: string;
        };
        Insert: {
          completion_tokens?: number | null;
          cost_usd: number;
          created_at?: string | null;
          id?: string;
          intent?: string | null;
          latency_ms?: number | null;
          model: string;
          operation: string;
          prompt_tokens?: number | null;
          provider: string;
          session_id?: string | null;
          user_id: string;
        };
        Update: {
          completion_tokens?: number | null;
          cost_usd?: number;
          created_at?: string | null;
          id?: string;
          intent?: string | null;
          latency_ms?: number | null;
          model?: string;
          operation?: string;
          prompt_tokens?: number | null;
          provider?: string;
          session_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_cost_logs_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "cook_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_cost_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          created_at: string | null;
          event_name: string;
          id: string;
          properties: Json | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          event_name: string;
          id?: string;
          properties?: Json | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          event_name?: string;
          id?: string;
          properties?: Json | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cook_session_messages: {
        Row: {
          content: string;
          created_at: string | null;
          current_step: number | null;
          feedback: string | null;
          id: string;
          role: string;
          session_id: string | null;
          sources: Json | null;
          voice_response: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          current_step?: number | null;
          feedback?: string | null;
          id?: string;
          role: string;
          session_id?: string | null;
          sources?: Json | null;
          voice_response?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          current_step?: number | null;
          feedback?: string | null;
          id?: string;
          role?: string;
          session_id?: string | null;
          sources?: Json | null;
          voice_response?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cook_session_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "cook_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      cook_session_photos: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cook_session_photos_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "cook_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cook_session_photos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cook_sessions: {
        Row: {
          changes_made: string | null;
          completed_at: string | null;
          completed_steps: Json | null;
          created_at: string | null;
          current_step: number | null;
          detected_learnings: Json | null;
          id: string;
          is_complete: boolean | null;
          master_recipe_id: string | null;
          outcome_notes: string | null;
          outcome_rating: number | null;
          outcome_tags: Json | null;
          scale_factor: number | null;
          skill_level_used: string | null;
          source_link_id: string | null;
          started_at: string | null;
          user_id: string | null;
          planned_at: string | null;
          planned_servings: number | null;
          planned_target_time: string | null;
          started_from_plan: boolean | null;
          version_id: string | null;
          voice_commands_used: number | null;
        };
        Insert: {
          changes_made?: string | null;
          completed_at?: string | null;
          completed_steps?: Json | null;
          created_at?: string | null;
          current_step?: number | null;
          detected_learnings?: Json | null;
          id?: string;
          is_complete?: boolean | null;
          master_recipe_id?: string | null;
          outcome_notes?: string | null;
          outcome_rating?: number | null;
          outcome_tags?: Json | null;
          planned_at?: string | null;
          planned_servings?: number | null;
          planned_target_time?: string | null;
          scale_factor?: number | null;
          skill_level_used?: string | null;
          source_link_id?: string | null;
          started_at?: string | null;
          started_from_plan?: boolean | null;
          user_id?: string | null;
          version_id?: string | null;
          voice_commands_used?: number | null;
        };
        Update: {
          changes_made?: string | null;
          completed_at?: string | null;
          completed_steps?: Json | null;
          created_at?: string | null;
          current_step?: number | null;
          detected_learnings?: Json | null;
          id?: string;
          is_complete?: boolean | null;
          master_recipe_id?: string | null;
          outcome_notes?: string | null;
          outcome_rating?: number | null;
          outcome_tags?: Json | null;
          planned_at?: string | null;
          planned_servings?: number | null;
          planned_target_time?: string | null;
          scale_factor?: number | null;
          skill_level_used?: string | null;
          source_link_id?: string | null;
          started_at?: string | null;
          started_from_plan?: boolean | null;
          user_id?: string | null;
          version_id?: string | null;
          voice_commands_used?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "cook_sessions_master_recipe_id_fkey";
            columns: ["master_recipe_id"];
            isOneToOne: false;
            referencedRelation: "master_recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cook_sessions_source_link_id_fkey";
            columns: ["source_link_id"];
            isOneToOne: false;
            referencedRelation: "recipe_source_links";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cook_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cook_sessions_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "master_recipe_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_logs: {
        Row: {
          cost_usd: number | null;
          created_at: string | null;
          duration_ms: number | null;
          error_message: string | null;
          extraction_layer: number | null;
          extraction_method: string | null;
          id: string;
          platform: string;
          source_url: string;
          success: boolean;
        };
        Insert: {
          cost_usd?: number | null;
          created_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          extraction_layer?: number | null;
          extraction_method?: string | null;
          id?: string;
          platform: string;
          source_url: string;
          success: boolean;
        };
        Update: {
          cost_usd?: number | null;
          created_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          extraction_layer?: number | null;
          extraction_method?: string | null;
          id?: string;
          platform?: string;
          source_url?: string;
          success?: boolean;
        };
        Relationships: [];
      };
      grocery_items: {
        Row: {
          category: string | null;
          checked_at: string | null;
          created_at: string | null;
          grocery_list_id: string | null;
          id: string;
          is_checked: boolean | null;
          is_manual: boolean | null;
          item: string;
          quantity: number | null;
          sort_order: number | null;
          source_master_recipe_ids: Json | null;
          unit: string | null;
        };
        Insert: {
          category?: string | null;
          checked_at?: string | null;
          created_at?: string | null;
          grocery_list_id?: string | null;
          id?: string;
          is_checked?: boolean | null;
          is_manual?: boolean | null;
          item: string;
          quantity?: number | null;
          sort_order?: number | null;
          source_master_recipe_ids?: Json | null;
          unit?: string | null;
        };
        Update: {
          category?: string | null;
          checked_at?: string | null;
          created_at?: string | null;
          grocery_list_id?: string | null;
          id?: string;
          is_checked?: boolean | null;
          is_manual?: boolean | null;
          item?: string;
          quantity?: number | null;
          sort_order?: number | null;
          source_master_recipe_ids?: Json | null;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "grocery_items_grocery_list_id_fkey";
            columns: ["grocery_list_id"];
            isOneToOne: false;
            referencedRelation: "grocery_lists";
            referencedColumns: ["id"];
          },
        ];
      };
      grocery_lists: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          master_recipe_ids: Json | null;
          name: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          master_recipe_ids?: Json | null;
          name: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          master_recipe_ids?: Json | null;
          name?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "grocery_lists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      master_recipe_versions: {
        Row: {
          based_on_source_id: string | null;
          category: string | null;
          change_notes: string | null;
          cook_time_minutes: number | null;
          created_at: string | null;
          created_from_mode: string | null;
          created_from_session_id: string | null;
          created_from_title: string | null;
          cuisine: string | null;
          description: string | null;
          difficulty_score: number | null;
          id: string;
          ingredients: Json;
          learnings: Json | null;
          master_recipe_id: string;
          mode: string;
          outcome_notes: string | null;
          outcome_rating: number | null;
          parent_version_id: string | null;
          prep_time_minutes: number | null;
          servings: number | null;
          servings_unit: string | null;
          steps: Json;
          title: string;
          version_number: number;
        };
        Insert: {
          based_on_source_id?: string | null;
          category?: string | null;
          change_notes?: string | null;
          cook_time_minutes?: number | null;
          created_at?: string | null;
          created_from_mode?: string | null;
          created_from_session_id?: string | null;
          created_from_title?: string | null;
          cuisine?: string | null;
          description?: string | null;
          difficulty_score?: number | null;
          id?: string;
          ingredients?: Json;
          learnings?: Json | null;
          master_recipe_id: string;
          mode: string;
          outcome_notes?: string | null;
          outcome_rating?: number | null;
          parent_version_id?: string | null;
          prep_time_minutes?: number | null;
          servings?: number | null;
          servings_unit?: string | null;
          steps?: Json;
          title: string;
          version_number: number;
        };
        Update: {
          based_on_source_id?: string | null;
          category?: string | null;
          change_notes?: string | null;
          cook_time_minutes?: number | null;
          created_at?: string | null;
          created_from_mode?: string | null;
          created_from_session_id?: string | null;
          created_from_title?: string | null;
          cuisine?: string | null;
          description?: string | null;
          difficulty_score?: number | null;
          id?: string;
          ingredients?: Json;
          learnings?: Json | null;
          master_recipe_id?: string;
          mode?: string;
          outcome_notes?: string | null;
          outcome_rating?: number | null;
          parent_version_id?: string | null;
          prep_time_minutes?: number | null;
          servings?: number | null;
          servings_unit?: string | null;
          steps?: Json;
          title?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "master_recipe_versions_based_on_source_id_fkey";
            columns: ["based_on_source_id"];
            isOneToOne: false;
            referencedRelation: "recipe_source_links";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "master_recipe_versions_created_from_session_id_fkey";
            columns: ["created_from_session_id"];
            isOneToOne: false;
            referencedRelation: "cook_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "master_recipe_versions_master_recipe_id_fkey";
            columns: ["master_recipe_id"];
            isOneToOne: false;
            referencedRelation: "master_recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "master_recipe_versions_parent_version_id_fkey";
            columns: ["parent_version_id"];
            isOneToOne: false;
            referencedRelation: "master_recipe_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      master_recipes: {
        Row: {
          category: string | null;
          cover_video_source_id: string | null;
          created_at: string | null;
          cuisine: string | null;
          current_version_id: string | null;
          description: string | null;
          forked_from_id: string | null;
          id: string;
          is_favorite: boolean | null;
          last_cooked_at: string | null;
          mode: string;
          planned_for: string | null;
          status: string | null;
          times_cooked: number | null;
          title: string;
          updated_at: string | null;
          user_id: string;
          user_notes: string | null;
          user_rating: number | null;
        };
        Insert: {
          category?: string | null;
          cover_video_source_id?: string | null;
          created_at?: string | null;
          cuisine?: string | null;
          current_version_id?: string | null;
          description?: string | null;
          forked_from_id?: string | null;
          id?: string;
          is_favorite?: boolean | null;
          last_cooked_at?: string | null;
          mode: string;
          planned_for?: string | null;
          status?: string | null;
          times_cooked?: number | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
          user_notes?: string | null;
          user_rating?: number | null;
        };
        Update: {
          category?: string | null;
          cover_video_source_id?: string | null;
          created_at?: string | null;
          cuisine?: string | null;
          current_version_id?: string | null;
          description?: string | null;
          forked_from_id?: string | null;
          id?: string;
          is_favorite?: boolean | null;
          last_cooked_at?: string | null;
          mode?: string;
          planned_for?: string | null;
          status?: string | null;
          times_cooked?: number | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
          user_notes?: string | null;
          user_rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_current_version";
            columns: ["current_version_id"];
            isOneToOne: false;
            referencedRelation: "master_recipe_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "master_recipes_cover_video_source_id_fkey";
            columns: ["cover_video_source_id"];
            isOneToOne: false;
            referencedRelation: "video_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "master_recipes_forked_from_id_fkey";
            columns: ["forked_from_id"];
            isOneToOne: false;
            referencedRelation: "master_recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "master_recipes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_knowledge: {
        Row: {
          content: string;
          created_at: string | null;
          doc_type: string | null;
          embedding: string | null;
          id: string;
          metadata: Json | null;
          mode: string | null;
          skill_level: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          doc_type?: string | null;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          mode?: string | null;
          skill_level?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          doc_type?: string | null;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          mode?: string | null;
          skill_level?: string | null;
        };
        Relationships: [];
      };
      recipe_source_links: {
        Row: {
          extracted_cuisine: string | null;
          extracted_description: string | null;
          extracted_ingredients: Json;
          extracted_mode: string | null;
          extracted_steps: Json;
          extracted_title: string | null;
          extraction_confidence: number | null;
          id: string;
          imported_at: string | null;
          link_status: string | null;
          linked_at: string | null;
          master_recipe_id: string | null;
          user_id: string;
          video_source_id: string;
        };
        Insert: {
          extracted_cuisine?: string | null;
          extracted_description?: string | null;
          extracted_ingredients?: Json;
          extracted_mode?: string | null;
          extracted_steps?: Json;
          extracted_title?: string | null;
          extraction_confidence?: number | null;
          id?: string;
          imported_at?: string | null;
          link_status?: string | null;
          linked_at?: string | null;
          master_recipe_id?: string | null;
          user_id: string;
          video_source_id: string;
        };
        Update: {
          extracted_cuisine?: string | null;
          extracted_description?: string | null;
          extracted_ingredients?: Json;
          extracted_mode?: string | null;
          extracted_steps?: Json;
          extracted_title?: string | null;
          extraction_confidence?: number | null;
          id?: string;
          imported_at?: string | null;
          link_status?: string | null;
          linked_at?: string | null;
          master_recipe_id?: string | null;
          user_id?: string;
          video_source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_source_links_master_recipe_id_fkey";
            columns: ["master_recipe_id"];
            isOneToOne: false;
            referencedRelation: "master_recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_source_links_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_source_links_video_source_id_fkey";
            columns: ["video_source_id"];
            isOneToOne: false;
            referencedRelation: "video_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      tips: {
        Row: {
          category: string;
          content: string;
          created_at: string | null;
          icon: string;
          id: string;
          is_active: boolean | null;
          mode: string | null;
          source: string | null;
          title: string;
          view_count: number | null;
        };
        Insert: {
          category: string;
          content: string;
          created_at?: string | null;
          icon: string;
          id?: string;
          is_active?: boolean | null;
          mode?: string | null;
          source?: string | null;
          title: string;
          view_count?: number | null;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string | null;
          icon?: string;
          id?: string;
          is_active?: boolean | null;
          mode?: string | null;
          source?: string | null;
          title?: string;
          view_count?: number | null;
        };
        Relationships: [];
      };
      user_cooking_memory: {
        Row: {
          content: string;
          created_at: string | null;
          embedding: string | null;
          id: string;
          label: string | null;
          memory_type: string | null;
          metadata: Json | null;
          source_message_id: string | null;
          source_session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          label?: string | null;
          memory_type?: string | null;
          metadata?: Json | null;
          source_message_id?: string | null;
          source_session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          label?: string | null;
          memory_type?: string | null;
          metadata?: Json | null;
          source_message_id?: string | null;
          source_session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_cooking_memory_source_message_id_fkey";
            columns: ["source_message_id"];
            isOneToOne: false;
            referencedRelation: "cook_session_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_cooking_memory_source_session_id_fkey";
            columns: ["source_session_id"];
            isOneToOne: false;
            referencedRelation: "cook_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_cooking_memory_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          cooking_mode: string | null;
          cooking_skill_level: string | null;
          created_at: string | null;
          current_streak: number | null;
          dietary_restrictions: Json | null;
          id: string;
          longest_streak: number | null;
          mixology_skill_level: string | null;
          pantry_staples: Json | null;
          pastry_skill_level: string | null;
          preferred_units: string | null;
          total_cooks: number | null;
          tts_speed: number | null;
          updated_at: string | null;
          user_id: string | null;
          voice_enabled: boolean | null;
        };
        Insert: {
          cooking_mode?: string | null;
          cooking_skill_level?: string | null;
          created_at?: string | null;
          current_streak?: number | null;
          dietary_restrictions?: Json | null;
          id?: string;
          longest_streak?: number | null;
          mixology_skill_level?: string | null;
          pantry_staples?: Json | null;
          pastry_skill_level?: string | null;
          preferred_units?: string | null;
          total_cooks?: number | null;
          tts_speed?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          voice_enabled?: boolean | null;
        };
        Update: {
          cooking_mode?: string | null;
          cooking_skill_level?: string | null;
          created_at?: string | null;
          current_streak?: number | null;
          dietary_restrictions?: Json | null;
          id?: string;
          longest_streak?: number | null;
          mixology_skill_level?: string | null;
          pantry_staples?: Json | null;
          pastry_skill_level?: string | null;
          preferred_units?: string | null;
          total_cooks?: number | null;
          tts_speed?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          voice_enabled?: boolean | null;
        };
        Relationships: [];
      };
      user_rate_limits: {
        Row: {
          created_at: string | null;
          daily_chat_messages: number | null;
          reset_date: string;
          tier: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          daily_chat_messages?: number | null;
          reset_date?: string;
          tier?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          daily_chat_messages?: number | null;
          reset_date?: string;
          tier?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_rate_limits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          display_name: string | null;
          email: string;
          id: string;
          imports_reset_at: string | null;
          imports_this_month: number | null;
          subscription_expires_at: string | null;
          subscription_tier: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email: string;
          id?: string;
          imports_reset_at?: string | null;
          imports_this_month?: number | null;
          subscription_expires_at?: string | null;
          subscription_tier?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string;
          id?: string;
          imports_reset_at?: string | null;
          imports_this_month?: number | null;
          subscription_expires_at?: string | null;
          subscription_tier?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      video_sources: {
        Row: {
          extracted_description: string | null;
          extracted_title: string | null;
          extraction_confidence: number | null;
          extraction_layer: number | null;
          extraction_method: string | null;
          first_imported_at: string | null;
          id: string;
          last_accessed_at: string | null;
          raw_caption: string | null;
          raw_transcript: string | null;
          source_creator: string | null;
          source_platform: string | null;
          source_thumbnail_url: string | null;
          source_url: string;
          source_url_hash: string | null;
          video_id: string | null;
        };
        Insert: {
          extracted_description?: string | null;
          extracted_title?: string | null;
          extraction_confidence?: number | null;
          extraction_layer?: number | null;
          extraction_method?: string | null;
          first_imported_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          raw_caption?: string | null;
          raw_transcript?: string | null;
          source_creator?: string | null;
          source_platform?: string | null;
          source_thumbnail_url?: string | null;
          source_url: string;
          source_url_hash?: string | null;
          video_id?: string | null;
        };
        Update: {
          extracted_description?: string | null;
          extracted_title?: string | null;
          extraction_confidence?: number | null;
          extraction_layer?: number | null;
          extraction_method?: string | null;
          first_imported_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          raw_caption?: string | null;
          raw_transcript?: string | null;
          source_creator?: string | null;
          source_platform?: string | null;
          source_thumbnail_url?: string | null;
          source_url?: string;
          source_url_hash?: string | null;
          video_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      append_detected_learning:
        | {
            Args: { p_learning: Json; p_session_id: string };
            Returns: undefined;
          }
        | {
            Args: { p_learning: Json; p_session_id: string; p_user_id: string };
            Returns: undefined;
          };
      call_generate_tips: { Args: never; Returns: undefined };
      check_rate_limit: {
        Args: { p_tier?: string; p_user_id: string };
        Returns: Json;
      };
      get_next_version_number: {
        Args: { p_master_recipe_id: string };
        Returns: number;
      };
      get_rate_limit_status: { Args: { p_user_id: string }; Returns: Json };
      match_recipe_knowledge: {
        Args: {
          filter_doc_types?: string[];
          filter_mode?: string;
          filter_skill?: string;
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          content: string;
          doc_type: string;
          id: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      match_user_memory: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          p_user_id: string;
          query_embedding: string;
        };
        Returns: {
          content: string;
          id: string;
          memory_type: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      set_rate_limit_for_testing: {
        Args: { p_count: number; p_user_id: string };
        Returns: undefined;
      };
      sync_subscription_tier: {
        Args: { p_tier: string };
        Returns: undefined;
      };
      get_challenge_completion_counts: {
        Args: {
          p_recipe_ids: string[];
          p_week_start: string;
          p_week_end: string;
        };
        Returns: { recipe_id: string; completion_count: number }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

// Convenience type aliases
export type MasterRecipe = Tables<"master_recipes">;
export type MasterRecipeVersion = Tables<"master_recipe_versions">;
export type RecipeSourceLink = Tables<"recipe_source_links">;
export type VideoSource = Tables<"video_sources">;
export type CookSession = Tables<"cook_sessions">;
export type CookSessionMessage = Tables<"cook_session_messages">;
export type GroceryList = Tables<"grocery_lists">;
export type GroceryItem = Tables<"grocery_items">;
export type UserPreferences = Tables<"user_preferences">;
export type User = Tables<"users">;
export type UserRateLimit = Tables<"user_rate_limits">;
export type AiCostLog = Tables<"ai_cost_logs">;
export type AnalyticsEvent = Tables<"analytics_events">;

// JSON field types for ingredients and steps
export interface VersionIngredient {
  id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  is_optional: boolean | null;
  sort_order: number | null;
  original_text: string | null;
  confidence_status: string | null;
  user_verified: boolean | null;
  grocery_category?: string | null;
  allergens?: string[];
}

// Learning types for cook sessions
export type LearningType =
  | "substitution"
  | "preference"
  | "timing"
  | "technique"
  | "addition"
  | "modification"
  | "tip";

// Version-level learning (stored in master_recipe_versions.learnings)
export interface VersionLearning {
  type: LearningType;
  content: string;
  added_at: string;
  // Optional for substitutions
  original?: string | null;
  replacement?: string | null;
}

/** @deprecated Use VersionLearning instead. Kept for backward compatibility. */
export interface UserNote {
  type: LearningType;
  content: string;
  added_at: string;
}

export interface VersionStep {
  id: string;
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  temperature_value: number | null;
  temperature_unit: string | null;
  equipment?: string[];
  techniques?: string[];
  timer_label?: string | null;
  /** @deprecated Use version.learnings instead. Kept for backward compatibility with old data. */
  user_notes?: UserNote[];
}

export interface DetectedLearning {
  type: LearningType;
  original: string | null;
  modification: string;
  context: string;
  /** Optional - kept for session context but learnings are version-level */
  step_number?: number;
  detected_at: string;
  confidence: number; // 0-1, >=0.8 auto-save, <0.8 show confirmation modal
}

// Import response types
export interface ImportSuccessResponse {
  success: true;
  master_recipe_id: string;
  version_id: string;
  source_link_id: string;
  recipe: {
    title: string;
    description: string | null;
    mode: string;
    cuisine: string | null;
  };
  already_imported?: boolean;
}

export interface ImportNeedsConfirmationResponse {
  success: true;
  needs_confirmation: true;
  source_link_id: string;
  extracted_recipe: {
    title: string;
    description: string | null;
    mode: string;
    cuisine: string | null;
    ingredients_count: number;
    steps_count: number;
  };
  similar_recipes: {
    id: string;
    title: string;
    mode: string;
    source_count: number;
    times_cooked: number;
  }[];
}

export interface ImportUpgradeRequiredResponse {
  success: false;
  upgrade_required: true;
  message: string;
  resets_at?: string;
}

export interface ImportFallbackResponse {
  success: false;
  fallback_mode: true;
  message: string;
  manual_fields: string[];
  potential_issues?: string[];
}

export interface ImportErrorResponse {
  success: false;
  error: string;
}

// Union types for edge function responses
export type ImportResponse =
  | ImportSuccessResponse
  | ImportNeedsConfirmationResponse
  | ImportUpgradeRequiredResponse
  | ImportFallbackResponse
  | ImportErrorResponse;

export type ConfirmLinkResponse =
  | {
      success: true;
      master_recipe_id: string;
      version_id?: string;
      recipe?: { title: string };
      message?: string;
    }
  | {
      success: false;
      error?: string;
      upgrade_required?: boolean;
      message?: string;
    };
