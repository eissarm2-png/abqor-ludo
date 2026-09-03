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
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          detail: Json
          id: string
          target_user: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          detail?: Json
          id?: string
          target_user?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          detail?: Json
          id?: string
          target_user?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          kind: string
          link: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          link?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          link?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_invites: {
        Row: {
          created_at: string
          from_id: string
          id: string
          max_players: number
          mode: string
          room_code: string
          room_id: string | null
          status: string
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          max_players?: number
          mode?: string
          room_code: string
          room_id?: string | null
          status?: string
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          max_players?: number
          mode?: string
          room_code?: string
          room_id?: string | null
          status?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_invites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      player_settings: {
        Row: {
          allow_invites: boolean
          battery_saver: boolean
          graphics: string
          language: string
          profile_visibility: string
          show_online: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_invites?: boolean
          battery_saver?: boolean
          graphics?: string
          language?: string
          profile_visibility?: string
          show_online?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_invites?: boolean
          battery_saver?: boolean
          graphics?: string
          language?: string
          profile_visibility?: string
          show_online?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string
          banned: boolean
          banned_reason: string | null
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
          banned?: boolean
          banned_reason?: string | null
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
          banned?: boolean
          banned_reason?: string | null
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
      room_members: {
        Row: {
          avatar: string
          display_name: string
          id: string
          joined_at: string
          ready: boolean
          room_id: string
          seat: number
          user_id: string
        }
        Insert: {
          avatar?: string
          display_name?: string
          id?: string
          joined_at?: string
          ready?: boolean
          room_id: string
          seat?: number
          user_id: string
        }
        Update: {
          avatar?: string
          display_name?: string
          id?: string
          joined_at?: string
          ready?: boolean
          room_id?: string
          seat?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          body: string
          created_at: string
          display_name: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          display_name?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          host_id: string
          id: string
          is_public: boolean
          match_id: string | null
          max_players: number
          mode: string
          name: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          host_id: string
          id?: string
          is_public?: boolean
          match_id?: string | null
          max_players?: number
          mode?: string
          name: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          host_id?: string
          id?: string
          is_public?: boolean
          match_id?: string | null
          max_players?: number
          mode?: string
          name?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          action: string
          created_at: string
          detail: Json
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      store_items: {
        Row: {
          active: boolean
          code: string
          cost_diamonds: number
          cost_gold: number
          description: string
          kind: string
          rarity: string
          sort: number
          title: string
          value: string
        }
        Insert: {
          active?: boolean
          code: string
          cost_diamonds?: number
          cost_gold?: number
          description?: string
          kind?: string
          rarity?: string
          sort?: number
          title: string
          value?: string
        }
        Update: {
          active?: boolean
          code?: string
          cost_diamonds?: number
          cost_gold?: number
          description?: string
          kind?: string
          rarity?: string
          sort?: number
          title?: string
          value?: string
        }
        Relationships: []
      }
      turn_events: {
        Row: {
          accepted: boolean
          created_at: string
          elapsed_ms: number
          id: string
          kind: string
          limit_ms: number
          match_id: string
          reason: string | null
          turn: number
          user_id: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          elapsed_ms?: number
          id?: string
          kind: string
          limit_ms?: number
          match_id: string
          reason?: string | null
          turn?: number
          user_id: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          elapsed_ms?: number
          id?: string
          kind?: string
          limit_ms?: number
          match_id?: string
          reason?: string | null
          turn?: number
          user_id?: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_economy: {
        Args: {
          _diamonds: number
          _gold: number
          _note?: string
          _uid: string
          _xp: number
        }
        Returns: {
          diamonds: number
          gold: number
          level: number
          xp: number
        }[]
      }
      admin_delete_announcement: { Args: { _id: string }; Returns: undefined }
      admin_delete_room: { Args: { _room: string }; Returns: undefined }
      admin_grant_item: {
        Args: { _code: string; _kind: string; _rarity?: string; _uid: string }
        Returns: undefined
      }
      admin_list_announcements: {
        Args: never
        Returns: {
          active: boolean
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          kind: string
          link: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "announcements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_users: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: {
          avatar: string
          banned: boolean
          banned_reason: string
          created_at: string
          diamonds: number
          display_name: string
          email: string
          games: number
          gold: number
          id: string
          is_admin: boolean
          level: number
          losses: number
          points: number
          wins: number
          xp: number
        }[]
      }
      admin_logs_list: {
        Args: { _limit?: number }
        Returns: {
          action: string
          admin_name: string
          created_at: string
          detail: Json
          id: string
          target_name: string
        }[]
      }
      admin_recent_matches: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          display_name: string
          duration_ms: number
          id: string
          mode: string
          moves: number
          players: number
          points: number
          result: string
        }[]
      }
      admin_rooms_list: {
        Args: { _limit?: number }
        Returns: {
          code: string
          created_at: string
          host_name: string
          id: string
          is_public: boolean
          max_players: number
          members: number
          mode: string
          name: string
          status: string
        }[]
      }
      admin_save_announcement: {
        Args: {
          _active: boolean
          _body: string
          _expires_at: string
          _id: string
          _kind: string
          _link: string
          _title: string
        }
        Returns: string
      }
      admin_set_ban: {
        Args: { _banned: boolean; _reason?: string; _uid: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _uid: string
        }
        Returns: undefined
      }
      admin_stats: {
        Args: never
        Returns: {
          admins: number
          banned: number
          diamonds: number
          domino_matches: number
          gold: number
          ludo_matches: number
          matches: number
          matches_24h: number
          users: number
        }[]
      }
      admin_turn_events: {
        Args: { _limit?: number }
        Returns: {
          accepted: boolean
          created_at: string
          display_name: string
          elapsed_ms: number
          id: string
          kind: string
          limit_ms: number
          match_id: string
          reason: string
          turn: number
        }[]
      }
      admin_update_profile: {
        Args: {
          _avatar?: string
          _banner?: string
          _display_name?: string
          _frame?: string
          _level?: number
          _uid: string
        }
        Returns: undefined
      }
      admin_upsert_chest: {
        Args: {
          _active: boolean
          _code: string
          _cooldown_minutes: number
          _cost_diamonds: number
          _cost_gold: number
          _description: string
          _sort: number
          _tier: number
          _title: string
        }
        Returns: undefined
      }
      admin_upsert_mission: {
        Args: {
          _active: boolean
          _code: string
          _description: string
          _goal: number
          _metric: string
          _period: string
          _reward_diamonds: number
          _reward_gold: number
          _reward_xp: number
          _sort: number
          _title: string
        }
        Returns: undefined
      }
      admin_upsert_store_item: {
        Args: {
          _active: boolean
          _code: string
          _cost_diamonds: number
          _cost_gold: number
          _description: string
          _kind: string
          _rarity: string
          _sort: number
          _title: string
          _value: string
        }
        Returns: undefined
      }
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
      create_room: {
        Args: { _max: number; _mode: string; _name: string; _public: boolean }
        Returns: {
          code: string
          room_id: string
        }[]
      }
      equip_item: { Args: { _code: string; _kind: string }; Returns: undefined }
      gen_room_code: { Args: never; Returns: string }
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
      get_player_settings: {
        Args: never
        Returns: {
          allow_invites: boolean
          battery_saver: boolean
          graphics: string
          language: string
          profile_visibility: string
          show_online: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_settings"
          isOneToOne: true
          isSetofReturn: false
        }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      host_update_room: {
        Args: { _max: number; _mode: string; _public: boolean; _room: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_room_host: { Args: { _room: string; _uid: string }; Returns: boolean }
      is_room_member: {
        Args: { _room: string; _uid: string }
        Returns: boolean
      }
      join_room: {
        Args: { _code: string }
        Returns: {
          ok: boolean
          reason: string
          room_id: string
        }[]
      }
      leave_room: { Args: { _room: string }; Returns: undefined }
      list_friends: {
        Args: never
        Returns: {
          avatar: string
          created_at: string
          direction: string
          display_name: string
          friendship_id: string
          status: string
          user_id: string
        }[]
      }
      list_game_invites: {
        Args: never
        Returns: {
          created_at: string
          direction: string
          id: string
          max_players: number
          mode: string
          other_avatar: string
          other_name: string
          room_code: string
          status: string
        }[]
      }
      list_public_rooms: {
        Args: never
        Returns: {
          code: string
          host_name: string
          id: string
          max_players: number
          members: number
          mode: string
          name: string
        }[]
      }
      list_security_events: {
        Args: { _limit?: number }
        Returns: {
          action: string
          created_at: string
          detail: Json
          id: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "security_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      log_admin: {
        Args: { _action: string; _detail: Json; _target: string }
        Returns: undefined
      }
      log_security_event: {
        Args: { _action: string; _detail?: Json }
        Returns: undefined
      }
      mark_notifications_read: { Args: { _id?: string }; Returns: Json }
      mission_period_start: { Args: { _period: string }; Returns: string }
      my_active_room: {
        Args: never
        Returns: {
          room_id: string
        }[]
      }
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
      purchase_store_item: {
        Args: { _code: string }
        Returns: {
          diamonds: number
          gold: number
          ok: boolean
          reason: string
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
      record_turn_event: {
        Args: {
          _accepted: boolean
          _elapsed_ms: number
          _kind: string
          _limit_ms: number
          _match_id: string
          _reason: string
          _turn: number
        }
        Returns: undefined
      }
      reject_all_game_invites: { Args: never; Returns: Json }
      require_admin: { Args: never; Returns: string }
      reset_room: { Args: { _room: string }; Returns: undefined }
      respond_friend_request: {
        Args: { _accept: boolean; _id: string }
        Returns: Json
      }
      respond_game_invite: {
        Args: { _accept: boolean; _id: string }
        Returns: Json
      }
      save_player_settings: {
        Args: { _settings: Json }
        Returns: {
          allow_invites: boolean
          battery_saver: boolean
          graphics: string
          language: string
          profile_visibility: string
          show_online: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_friend_request: { Args: { _name: string }; Returns: Json }
      send_game_invite: {
        Args: { _room_code: string; _to: string }
        Returns: Json
      }
      set_room_ready: {
        Args: { _ready: boolean; _room: string }
        Returns: undefined
      }
      start_room_match: {
        Args: { _room: string }
        Returns: {
          match_id: string
          ok: boolean
          reason: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
