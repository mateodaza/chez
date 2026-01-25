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
      cook_session_messages: {
        Row: {
          content: string;
          created_at: string | null;
          current_step: number | null;
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
      cook_sessions: {
        Row: {
          changes_made: string | null;
          completed_at: string | null;
          completed_steps: Json | null;
          created_at: string | null;
          current_step: number | null;
          id: string;
          is_complete: boolean | null;
          outcome_notes: string | null;
          outcome_rating: number | null;
          outcome_tags: Json | null;
          recipe_id: string | null;
          scale_factor: number | null;
          skill_level_used: string | null;
          started_at: string | null;
          user_id: string | null;
          voice_commands_used: number | null;
        };
        Insert: {
          changes_made?: string | null;
          completed_at?: string | null;
          completed_steps?: Json | null;
          created_at?: string | null;
          current_step?: number | null;
          id?: string;
          is_complete?: boolean | null;
          outcome_notes?: string | null;
          outcome_rating?: number | null;
          outcome_tags?: Json | null;
          recipe_id?: string | null;
          scale_factor?: number | null;
          skill_level_used?: string | null;
          started_at?: string | null;
          user_id?: string | null;
          voice_commands_used?: number | null;
        };
        Update: {
          changes_made?: string | null;
          completed_at?: string | null;
          completed_steps?: Json | null;
          created_at?: string | null;
          current_step?: number | null;
          id?: string;
          is_complete?: boolean | null;
          outcome_notes?: string | null;
          outcome_rating?: number | null;
          outcome_tags?: Json | null;
          recipe_id?: string | null;
          scale_factor?: number | null;
          skill_level_used?: string | null;
          started_at?: string | null;
          user_id?: string | null;
          voice_commands_used?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "cook_sessions_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cook_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
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
          source_recipe_ids: Json | null;
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
          source_recipe_ids?: Json | null;
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
          source_recipe_ids?: Json | null;
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
          name: string;
          recipe_ids: Json | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          recipe_ids?: Json | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          recipe_ids?: Json | null;
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
      recipe_ingredients: {
        Row: {
          allergens: Json | null;
          confidence_status: string | null;
          created_at: string | null;
          grocery_category: string | null;
          id: string;
          is_optional: boolean | null;
          item: string;
          original_text: string | null;
          preparation: string | null;
          quantity: number | null;
          recipe_id: string | null;
          sort_order: number | null;
          substitution_notes: string | null;
          suggested_correction: string | null;
          unit: string | null;
          user_verified: boolean | null;
        };
        Insert: {
          allergens?: Json | null;
          confidence_status?: string | null;
          created_at?: string | null;
          grocery_category?: string | null;
          id?: string;
          is_optional?: boolean | null;
          item: string;
          original_text?: string | null;
          preparation?: string | null;
          quantity?: number | null;
          recipe_id?: string | null;
          sort_order?: number | null;
          substitution_notes?: string | null;
          suggested_correction?: string | null;
          unit?: string | null;
          user_verified?: boolean | null;
        };
        Update: {
          allergens?: Json | null;
          confidence_status?: string | null;
          created_at?: string | null;
          grocery_category?: string | null;
          id?: string;
          is_optional?: boolean | null;
          item?: string;
          original_text?: string | null;
          preparation?: string | null;
          quantity?: number | null;
          recipe_id?: string | null;
          sort_order?: number | null;
          substitution_notes?: string | null;
          suggested_correction?: string | null;
          unit?: string | null;
          user_verified?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
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
      recipe_steps: {
        Row: {
          created_at: string | null;
          duration_minutes: number | null;
          equipment: Json | null;
          id: string;
          instruction: string;
          recipe_id: string | null;
          skill_adaptations: Json | null;
          step_number: number;
          techniques: Json | null;
          temperature_unit: string | null;
          temperature_value: number | null;
          timer_label: string | null;
        };
        Insert: {
          created_at?: string | null;
          duration_minutes?: number | null;
          equipment?: Json | null;
          id?: string;
          instruction: string;
          recipe_id?: string | null;
          skill_adaptations?: Json | null;
          step_number: number;
          techniques?: Json | null;
          temperature_unit?: string | null;
          temperature_value?: number | null;
          timer_label?: string | null;
        };
        Update: {
          created_at?: string | null;
          duration_minutes?: number | null;
          equipment?: Json | null;
          id?: string;
          instruction?: string;
          recipe_id?: string | null;
          skill_adaptations?: Json | null;
          step_number?: number;
          techniques?: Json | null;
          temperature_unit?: string | null;
          temperature_value?: number | null;
          timer_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          category: string | null;
          cook_time_minutes: number | null;
          created_at: string | null;
          cuisine: string | null;
          description: string | null;
          difficulty_score: number | null;
          extraction_confidence: number | null;
          extraction_layer: number | null;
          extraction_method: string | null;
          id: string;
          is_favorite: boolean | null;
          last_cooked_at: string | null;
          mode: string;
          original_skill_level: string | null;
          parent_recipe_id: string | null;
          planned_for: string | null;
          prep_time_minutes: number | null;
          raw_caption: string | null;
          raw_transcript: string | null;
          servings: number | null;
          servings_unit: string | null;
          source_creator: string | null;
          source_platform: string | null;
          source_thumbnail_url: string | null;
          source_url: string | null;
          status: string | null;
          tags: Json | null;
          times_cooked: number | null;
          title: string;
          total_time_minutes: number | null;
          updated_at: string | null;
          user_id: string | null;
          user_notes: string | null;
          user_rating: number | null;
          variation_group_id: string | null;
        };
        Insert: {
          category?: string | null;
          cook_time_minutes?: number | null;
          created_at?: string | null;
          cuisine?: string | null;
          description?: string | null;
          difficulty_score?: number | null;
          extraction_confidence?: number | null;
          extraction_layer?: number | null;
          extraction_method?: string | null;
          id?: string;
          is_favorite?: boolean | null;
          last_cooked_at?: string | null;
          mode: string;
          original_skill_level?: string | null;
          parent_recipe_id?: string | null;
          planned_for?: string | null;
          prep_time_minutes?: number | null;
          raw_caption?: string | null;
          raw_transcript?: string | null;
          servings?: number | null;
          servings_unit?: string | null;
          source_creator?: string | null;
          source_platform?: string | null;
          source_thumbnail_url?: string | null;
          source_url?: string | null;
          status?: string | null;
          tags?: Json | null;
          times_cooked?: number | null;
          title: string;
          total_time_minutes?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          user_notes?: string | null;
          user_rating?: number | null;
          variation_group_id?: string | null;
        };
        Update: {
          category?: string | null;
          cook_time_minutes?: number | null;
          created_at?: string | null;
          cuisine?: string | null;
          description?: string | null;
          difficulty_score?: number | null;
          extraction_confidence?: number | null;
          extraction_layer?: number | null;
          extraction_method?: string | null;
          id?: string;
          is_favorite?: boolean | null;
          last_cooked_at?: string | null;
          mode?: string;
          original_skill_level?: string | null;
          parent_recipe_id?: string | null;
          planned_for?: string | null;
          prep_time_minutes?: number | null;
          raw_caption?: string | null;
          raw_transcript?: string | null;
          servings?: number | null;
          servings_unit?: string | null;
          source_creator?: string | null;
          source_platform?: string | null;
          source_thumbnail_url?: string | null;
          source_url?: string | null;
          status?: string | null;
          tags?: Json | null;
          times_cooked?: number | null;
          title?: string;
          total_time_minutes?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          user_notes?: string | null;
          user_rating?: number | null;
          variation_group_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_parent_recipe_id_fkey";
            columns: ["parent_recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_cooking_memory: {
        Row: {
          content: string;
          created_at: string | null;
          embedding: string | null;
          id: string;
          memory_type: string | null;
          metadata: Json | null;
          source_recipe_id: string | null;
          source_session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          memory_type?: string | null;
          metadata?: Json | null;
          source_recipe_id?: string | null;
          source_session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          memory_type?: string | null;
          metadata?: Json | null;
          source_recipe_id?: string | null;
          source_session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_cooking_memory_source_recipe_id_fkey";
            columns: ["source_recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
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
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
