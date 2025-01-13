import { Session } from "@supabase/supabase-js";
import { User } from "@supabase/supabase-js";
  
export type AuthError = {
  message: string;
}

export type AuthResponse = {
  user: User | null;
  session: Session | null;
  profile?: UserProfile | null;
  error?: string;
  status?: 'verify_email' | 'error' | 'success' | 'redirect_to_login';
};

export interface UserProfile {
  name: string;
  gender: string;
  age: string;
  postcode: string;
  constituency: string;
  mp: string;
  mp_id?: number;
  selected_topics: string[];
  email: string;
  email_verified?: boolean;
  newsletter?: boolean;
  ai_searches_count?: number;
  ai_and_ai_hansard_searches_last_reset?: string;
  votes_count?: number;
  votes_last_reset?: string;
  hansard_ai_searches_count?: number;
  rss_feeds?: Array<{
    url: string;
    title: string;
    last_checked: string;
  }>;
}

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
      debates_new: {
        Row: {
          created_at: string | null
          date: string
          ext_id: string
          house: string
          title: string
          type: string
          analysis: string
          speaker_points: string[]
        }
        Insert: {
          analysis: string
          speaker_points: string[]
          created_at?: string | null
          date: string
          ext_id: string
          house: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          analysis?: string
          speaker_points?: string[]
          created_at?: string | null
          date?: string
          ext_id?: string
          house?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancel_date: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string | null
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
          votes_count?: number
          votes_last_reset?: string
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