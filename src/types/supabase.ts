import { Division } from "."

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      debates: {
        Row: {
          ai_key_points: Json
          ai_question_1: string
          ai_question_1_ayes: number
          ai_question_1_noes: number
          ai_question_1_topic: string
          ai_question_2: string
          ai_question_2_ayes: number
          ai_question_2_noes: number
          ai_question_2_topic: string
          ai_question_3: string
          ai_question_3_ayes: number
          ai_question_3_noes: number
          ai_question_3_topic: string
          ai_summary: string
          ai_tags: Json
          ai_title: string | null
          ai_tone: string | null
          ai_topics: Json
          contribution_count: number
          created_at: string | null
          date: string
          ext_id: string
          house: string
          id: string
          interest_factors: Json | null
          interest_score: number | null
          last_updated: string | null
          location: string
          next_ext_id: string | null
          parent_ext_id: string
          parent_title: string
          party_count: Json | null
          prev_ext_id: string | null
          search_text: string | null
          search_vector: unknown | null
          speaker_count: number
          title: string
          type: string
          engagement_count: number | null
          divisions: Division[]
          ai_comment_thread: Json | null
        }
        Insert: {
          ai_key_points?: Json
          ai_question_1?: string
          ai_question_1_ayes?: number
          ai_question_1_noes?: number
          ai_question_1_topic?: string
          ai_question_2?: string
          ai_question_2_ayes?: number
          ai_question_2_noes?: number
          ai_question_2_topic?: string
          ai_question_3?: string
          ai_question_3_ayes?: number
          ai_question_3_noes?: number
          ai_question_3_topic?: string
          ai_summary?: string
          ai_tags?: Json
          ai_title?: string | null
          ai_tone?: string | null
          ai_topics?: Json
          contribution_count?: number
          created_at?: string | null
          date: string
          ext_id: string
          house: string
          id?: string
          interest_factors?: Json | null
          interest_score?: number | null
          last_updated?: string | null
          location: string
          next_ext_id?: string | null
          parent_ext_id: string
          parent_title: string
          party_count?: Json | null
          prev_ext_id?: string | null
          search_text?: string | null
          search_vector?: unknown | null
          speaker_count?: number
          title: string
          type: string
          ai_comment_thread?: Json | null
          divisions?: Division[]
          engagement_count?: number | null
        }
        Update: {
          ai_key_points?: Json
          ai_question_1?: string
          ai_question_1_ayes?: number
          ai_question_1_noes?: number
          ai_question_1_topic?: string
          ai_question_2?: string
          ai_question_2_ayes?: number
          ai_question_2_noes?: number
          ai_question_2_topic?: string
          ai_question_3?: string
          ai_question_3_ayes?: number
          ai_question_3_noes?: number
          ai_question_3_topic?: string
          ai_summary?: string
          ai_tags?: Json
          ai_title?: string | null
          ai_tone?: string | null
          ai_topics?: Json
          contribution_count?: number
          created_at?: string | null
          date?: string
          ext_id?: string
          house?: string
          id?: string
          interest_factors?: Json | null
          interest_score?: number | null
          last_updated?: string | null
          location?: string
          next_ext_id?: string | null
          parent_ext_id?: string
          parent_title?: string
          party_count?: Json | null
          prev_ext_id?: string | null
          search_text?: string | null
          search_vector?: unknown | null
          speaker_count?: number
          title?: string
          type?: string
          ai_comment_thread?: Json | null
          divisions?: Division[]
          engagement_count?: number | null
        }
        Relationships: []
      }
      debate_votes: {
        Row: {
          id: string
          user_id: string
          debate_id: string
          question_number: number
          vote: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          debate_id: string
          question_number: number
          vote: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          debate_id?: string
          question_number?: number
          vote?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debate_votes_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      postcode_lookup: {
        Row: {
          constituency: string | null
          mp: string | null
          postcode: string
        }
        Insert: {
          constituency?: string | null
          mp?: string | null
          postcode: string
        }
        Update: {
          constituency?: string | null
          mp?: string | null
          postcode?: string
        }
        Relationships: []
      }
      speakers: {
        Row: {
          age: number | null
          badge_title: string | null
          constituency: string | null
          department: string | null
          email: string | null
          id: string
          image_url: string | null
          is_current: boolean
          media: Json | null
          ministerial_ranking: number | null
          name: string
          party: string | null
          peerage_type: string | null
          start_date: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          age?: number | null
          badge_title?: string | null
          constituency?: string | null
          department?: string | null
          email?: string | null
          id: string
          image_url?: string | null
          is_current?: boolean
          media?: Json | null
          ministerial_ranking?: number | null
          name: string
          party?: string | null
          peerage_type?: string | null
          start_date?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          age?: number | null
          badge_title?: string | null
          constituency?: string | null
          department?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_current?: boolean
          media?: Json | null
          ministerial_ranking?: number | null
          name?: string
          party?: string | null
          peerage_type?: string | null
          start_date?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancel_date: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string | null
          plan_type: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancel_date?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string | null
          plan_type?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancel_date?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string | null
          plan_type?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          ai_chats: Json | null
          constituency: string | null
          created_at: string
          email: string | null
          gender: string | null
          age: number | null
          id: string
          mp: string | null
          name: string | null
          newsletter_frequency: string | null
          postcode: string | null
          profile_image_url: string | null
          selected_topics: string[] | null
          updated_at: string
          want_newsletter: boolean | null
          email_verified: boolean
        }
        Insert: {
          ai_chats?: Json | null
          constituency?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          age?: number | null
          id: string
          mp?: string | null
          name?: string | null
          newsletter_frequency?: string | null
          postcode?: string | null
          profile_image_url?: string | null
          selected_topics?: string[] | null
          updated_at?: string
          want_newsletter?: boolean | null
          email_verified: boolean
        }
        Update: {
          ai_chats?: Json | null
          constituency?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          age?: number | null
          id?: string
          mp?: string | null
          name?: string | null
          newsletter_frequency?: string | null
          postcode?: string | null
          profile_image_url?: string | null
          selected_topics?: string[] | null
          updated_at?: string
          want_newsletter?: boolean | null
          email_verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_unvoted_debates: {
        Args: {
          p_user_id: string  // UUID
          p_limit?: number
          p_cursor?: string  // UUID
        }
        Returns: {
          result_id: string
          ai_key_points: string
          ai_question_1: string
          ai_question_1_ayes: number
          ai_question_1_noes: number
          ai_question_1_topic: string
          ai_question_2: string
          ai_question_2_ayes: number
          ai_question_2_noes: number
          ai_question_2_topic: string
          ai_question_3: string
          ai_question_3_ayes: number
          ai_question_3_noes: number
          ai_question_3_topic: string
          ai_summary: string
          ai_tags: string
          ai_title: string | null
          ai_tone: string | null
          ai_topics: string
          contribution_count: number
          created_at: string
          date: string
          ext_id: string
          house: string
          interest_factors: string | null
          interest_score: number | null
          last_updated: string | null
          location: string
          next_ext_id: string | null
          parent_ext_id: string
          parent_title: string
          party_count: string | null
          prev_ext_id: string | null
          search_text: string | null
          search_vector: unknown | null
          speaker_count: number
          title: string
          type: string
          ai_comment_thread: string
          divisions: string
          engagement_count: number | null
        }[]
      }
      get_voted_debates: {
        Args: {
          p_limit?: number
          p_cursor?: string  // UUID
        }
        Returns: {
          id: string
          ai_key_points: string
          ai_question_1: string
          ai_question_1_ayes: number
          ai_question_1_noes: number
          ai_question_1_topic: string
          ai_question_2: string
          ai_question_2_ayes: number
          ai_question_2_noes: number
          ai_question_2_topic: string
          ai_question_3: string
          ai_question_3_ayes: number
          ai_question_3_noes: number
          ai_question_3_topic: string
          ai_summary: string
          ai_tags: string
          ai_title: string | null
          ai_tone: string | null
          ai_topics: string
          contribution_count: number
          created_at: string
          date: string
          ext_id: string
          house: string
          interest_factors: string | null
          interest_score: number | null
          last_updated: string | null
          location: string
          next_ext_id: string | null
          parent_ext_id: string
          parent_title: string
          party_count: string | null
          prev_ext_id: string | null
          search_text: string | null
          search_vector: unknown | null
          speaker_count: number
          title: string
          type: string
          engagement_count?: number
          total_score?: number
        }[]
      },
      create_user_with_profile: {
        Args: {
          user_email: string
          user_password: string
          user_name: string
        }
      },
      submit_debate_vote: {
        Args: {
          p_debate_id: string
          p_question_number: number
          p_vote: boolean
        }
        Returns: boolean
      },
      get_user_id_by_email: {
        Args: {
          email_param: string
        }
        Returns: string | null
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
