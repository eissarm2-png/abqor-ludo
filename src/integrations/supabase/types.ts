export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chest_defs: {
        Row: {
          active: boolean
          code: string
          cooldown_minutes: number
          cost_diamonds: number
          cost_gold: number
          description: string
          sort: number
          tier: number
          title: string
        }
        Insert: {
          active?: boolean
          code: string
          cooldown_minutes?: number
          cost_diamonds?: number
          cost_gold?: number
          description: string
          sort?: number
          tier?: number
          title: string
        }
        Update: {
          active?: boolean
          code?: string
          cooldown_minutes?: number
          cost_diamonds?: number
          cost_gold?: number
          description?: string
          sort?: number
          tier?: number
          title?: string
        }
        Relationships: []
      }
      economy_transactions: {
        Row: {
          created_at: string
          detail: Json
          diamonds_delta: number
          gold_delta: number
          id: string
          kind: string
          user_id: string
          xp_delta: number
        }
        Insert: {
          created_at?: string
          detail?: Json
          diamonds_delta?: number
          gold_delta?: number
          id?: string
          kind: string
          user_id: string
          xp_delta?: number
        }
        Update: {
          created_at?: string
          detail?: Json
          diamonds_delta?: number
          gold_delta?: number
          id?: string
          kind?: string
          user_id?: string
          xp_delta?: number
        }
        Relationships: []
      }
      game_results: {
        Row: {
          created_at: string
          duration_ms: number
          id: string
          match_id: string | null
          mode: string
          moves: number
          players: number
          points: number
          result: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          id?: string
          match_id?: string | null
          mode?: string
          moves?: number
          players?: number
          points?: number
          result: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          id?: string
          match_id?: string | null
          mode?: string
          moves?: number
          players?: number
          points?: number
          result?: string
          user_id?: string
        }
        Relationships: []
      }
      mission_defs: {
        Row: {
          active: boolean
          code: string
          description: string
          goal: number
          metric: string
          period: string
          reward_diamonds: number
          reward_gold: number
          reward_xp: number
          sort: number
          title: string
        }
        Insert: {
          active?: boolean
          code: string
          description: string
          goal: number
          metric: string
          period: string
          reward_diamonds?: number
          reward_gold?: number
          reward_xp?: number
          sort?: number
          title: string
        }
        Update: {
          active?: boolean
          code?: string
          description?: string
          goal?: number
          metric?: string
          period?: string
          reward_diamonds?: number
          reward_gold?: number
          reward_xp?: number
          sort?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string
          banner: string
          created_at: string
          diamonds: number
          display_name: string
          frame: string
          games: number
          gold: number
          id: string
          level: number
          losses: number
          points: number
          updated_at: string
          wins: number
          xp: number
        }
        Insert: {
          avatar?: string
          banner?: string
          created_at?: string
          diamonds?: number
          display_name?: string
          frame?: string
          games?: number
          gold?: number
          id: string
          level?: number
          losses?: number
          points?: number
          updated_at?: string
          wins?: number
          xp?: number
        }
        Update: {
          avatar?: string
          banner?: string
          created_at?: string
          diamonds?: number
          display_name?: string
          frame?: string
          games?: number
          gold?: number
          id?: string
          level?: number
          losses?: number
          points?: number
          updated_at?: string
          wins?: number
          xp?: number
        }
        Relationships: []
      }
      user_items: {
        Row: {
          code: string
          created_at: string
          id: string
          kind: string
          rarity: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          kind: string
          rarity?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          kind?: string
          rarity?: string
          user_id?: string
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          claimed_at: string | null
          code: string
          id: string
          period_start: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          code: string
          id?: string
          period_start: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          code?: string
          id?: string
          period_start?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "mission_defs"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_missions: {
        Args: { _amount: number; _metric: string; _uid: string }
        Returns: undefined
      }
      claim_mission: {
        Args: { _code: string }
        Returns: {
          diamonds: number
          gold: number
          ok: boolean
          reason: string
          xp: number
        }[]
      }
      get_chests: {
        Args: never
        Returns: {
          code: string
          cooldown_minutes: number
          cost_diamonds: number
          cost_gold: number
          description: string
          next_free_at: string
          sort: number
          tier: number
          title: string
        }[]
      }
      get_missions: {
        Args: never
        Returns: {
          claimable: boolean
          claimed: boolean
          code: string
          description: string
          goal: number
          period: string
          period_start: string
          progress: number
          resets_at: string
          reward_diamonds: number
          reward_gold: number
          reward_xp: number
          sort: number
          title: string
        }[]
      }
      grant_rewards: {
        Args: {
          _detail: Json
          _diamonds: number
          _gold: number
          _kind: string
          _uid: string
          _xp: number
        }
        Returns: undefined
      }
      mission_period_start: { Args: { _period: string }; Returns: string }
      open_chest: {
        Args: { _code: string }
        Returns: {
          diamonds: number
          gold: number
          is_new: boolean
          item_code: string
          item_kind: string
          next_free_at: string
          ok: boolean
          rarity: string
          reason: string
          xp: number
        }[]
      }
      record_game_result: {
        Args: {
          _duration_ms?: number
          _match_id: string
          _mode?: string
          _moves?: number
          _players: number
          _result: string
        }
        Returns: {
          duplicate: boolean
          gold: number
          points: number
          xp: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
