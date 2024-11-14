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
      batch_status: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string | null
          debate_type: string
          end_date: string
          id: number
          start_date: string
          status: string
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string | null
          debate_type: string
          end_date: string
          id?: number
          start_date: string
          status: string
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string | null
          debate_type?: string
          end_date?: string
          id?: number
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      commons: {
        Row: {
          analysis: string | null
          category: string | null
          date: string | null
          extracts: Json | null
          id: string
          labels: Json | null
          proposing_minister: string | null
          rewritten_speeches: Json | null
          speaker_ids: string[] | null
          speaker_names: string[] | null
          speeches: Json | null
          speechesparallel: boolean | null
          subtitle: string | null
          tags: string[] | null
          title: string
          topics: string[] | null
        }
        Insert: {
          analysis?: string | null
          category?: string | null
          date?: string | null
          extracts?: Json | null
          id: string
          labels?: Json | null
          proposing_minister?: string | null
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string[] | null
          speeches?: Json | null
          speechesparallel?: boolean | null
          subtitle?: string | null
          tags?: string[] | null
          title: string
          topics?: string[] | null
        }
        Update: {
          analysis?: string | null
          category?: string | null
          date?: string | null
          extracts?: Json | null
          id?: string
          labels?: Json | null
          proposing_minister?: string | null
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string[] | null
          speeches?: Json | null
          speechesparallel?: boolean | null
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          topics?: string[] | null
        }
        Relationships: []
      }
      debate_votes: {
        Row: {
          created_at: string | null
          debate_id: string
          id: string
          question_number: number
          user_id: string
          vote: boolean
        }
        Insert: {
          created_at?: string | null
          debate_id: string
          id?: string
          question_number: number
          user_id: string
          vote: boolean
        }
        Update: {
          created_at?: string | null
          debate_id?: string
          id?: string
          question_number?: number
          user_id?: string
          vote?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "debate_votes_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
        ]
      }
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
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          message: string
          name: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          message: string
          name?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string
          name?: string | null
          type?: string
        }
        Relationships: []
      }
      intro: {
        Row: {
          id: string
          rewritten_speeches: Json | null
          speaker_ids: string[] | null
          speaker_names: string | null
          speeches: Json | null
          speechesparallel: boolean
          title: string
          type: string | null
        }
        Insert: {
          id: string
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string | null
          speeches?: Json | null
          speechesparallel?: boolean
          title: string
          type?: string | null
        }
        Update: {
          id?: string
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string | null
          speeches?: Json | null
          speechesparallel?: boolean
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      lords: {
        Row: {
          analysis: string | null
          category: string | null
          date: string | null
          extracts: Json | null
          id: string
          labels: Json | null
          proposing_minister: string | null
          rewritten_speeches: Json | null
          speaker_ids: string[] | null
          speaker_names: string[] | null
          speeches: Json | null
          speechesparallel: boolean | null
          subtitle: string | null
          tags: string[] | null
          title: string
          topics: string[] | null
        }
        Insert: {
          analysis?: string | null
          category?: string | null
          date?: string | null
          extracts?: Json | null
          id: string
          labels?: Json | null
          proposing_minister?: string | null
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string[] | null
          speeches?: Json | null
          speechesparallel?: boolean | null
          subtitle?: string | null
          tags?: string[] | null
          title: string
          topics?: string[] | null
        }
        Update: {
          analysis?: string | null
          category?: string | null
          date?: string | null
          extracts?: Json | null
          id?: string
          labels?: Json | null
          proposing_minister?: string | null
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string[] | null
          speeches?: Json | null
          speechesparallel?: boolean | null
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          topics?: string[] | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          newsletter_frequency: string | null
          postcode: string | null
          selected_topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          newsletter_frequency?: string | null
          postcode?: string | null
          selected_topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          newsletter_frequency?: string | null
          postcode?: string | null
          selected_topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          postcode: string | null
          profile_image: string | null
          selected_topics: string[] | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          postcode?: string | null
          profile_image?: string | null
          selected_topics?: string[] | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          postcode?: string | null
          profile_image?: string | null
          selected_topics?: string[] | null
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
      publicbills: {
        Row: {
          analysis: string | null
          category: string | null
          date: string | null
          extracts: Json | null
          id: string
          labels: Json | null
          proposing_minister: string | null
          rewritten_speeches: Json | null
          speaker_ids: string[] | null
          speaker_names: string[] | null
          speeches: Json | null
          speechesparallel: boolean | null
          subtitle: string | null
          tags: string[] | null
          title: string
          topics: string[] | null
        }
        Insert: {
          analysis?: string | null
          category?: string | null
          date?: string | null
          extracts?: Json | null
          id: string
          labels?: Json | null
          proposing_minister?: string | null
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string[] | null
          speeches?: Json | null
          speechesparallel?: boolean | null
          subtitle?: string | null
          tags?: string[] | null
          title: string
          topics?: string[] | null
        }
        Update: {
          analysis?: string | null
          category?: string | null
          date?: string | null
          extracts?: Json | null
          id?: string
          labels?: Json | null
          proposing_minister?: string | null
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string[] | null
          speeches?: Json | null
          speechesparallel?: boolean | null
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          topics?: string[] | null
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
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          interests: string[] | null
          name: string | null
          postcode: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          interests?: string[] | null
          name?: string | null
          postcode?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          interests?: string[] | null
          name?: string | null
          postcode?: string | null
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
          id: string
          mp: string | null
          name: string | null
          newsletter_frequency: string | null
          postcode: string | null
          profile_image_url: string | null
          selected_topics: string[] | null
          updated_at: string
          want_newsletter: boolean | null
        }
        Insert: {
          ai_chats?: Json | null
          constituency?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id: string
          mp?: string | null
          name?: string | null
          newsletter_frequency?: string | null
          postcode?: string | null
          profile_image_url?: string | null
          selected_topics?: string[] | null
          updated_at?: string
          want_newsletter?: boolean | null
        }
        Update: {
          ai_chats?: Json | null
          constituency?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          mp?: string | null
          name?: string | null
          newsletter_frequency?: string | null
          postcode?: string | null
          profile_image_url?: string | null
          selected_topics?: string[] | null
          updated_at?: string
          want_newsletter?: boolean | null
        }
        Relationships: []
      }
      westminster: {
        Row: {
          analysis: string | null
          category: string | null
          date: string | null
          extracts: Json | null
          id: string
          labels: Json | null
          proposing_minister: string | null
          rewritten_speeches: Json | null
          speaker_ids: string[] | null
          speaker_names: string[] | null
          speeches: Json | null
          speechesparallel: boolean | null
          subtitle: string | null
          tags: string[] | null
          title: string
          topics: string[] | null
        }
        Insert: {
          analysis?: string | null
          category?: string | null
          date?: string | null
          extracts?: Json | null
          id: string
          labels?: Json | null
          proposing_minister?: string | null
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string[] | null
          speeches?: Json | null
          speechesparallel?: boolean | null
          subtitle?: string | null
          tags?: string[] | null
          title: string
          topics?: string[] | null
        }
        Update: {
          analysis?: string | null
          category?: string | null
          date?: string | null
          extracts?: Json | null
          id?: string
          labels?: Json | null
          proposing_minister?: string | null
          rewritten_speeches?: Json | null
          speaker_ids?: string[] | null
          speaker_names?: string[] | null
          speeches?: Json | null
          speechesparallel?: boolean | null
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          topics?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_ai_chat: {
        Args: {
          user_id: string
          thread_id: string
          chat_title: string
        }
        Returns: undefined
      }
      delete_user: {
        Args: {
          user_id: string
        }
        Returns: undefined
      }
      fetch_speakers: {
        Args: {
          speaker_ids: string[]
        }
        Returns: {
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
        }[]
      }
      find_previous_debate_date: {
        Args: {
          start_date: string
          debate_types?: string[]
        }
        Returns: string
      }
      get_debates_with_engagement: {
        Args: {
          p_limit: number
          p_cursor?: string
        }
        Returns: {
          id: string
          title: string
          date: string
          type: string
          house: string
          location: string
          ai_title: string | null
          ai_summary: string
          ai_tone: string | null
          ai_topics: Json
          ai_tags: Json
          ai_key_points: Json
          ai_question_1: string
          ai_question_1_topic: string
          ai_question_1_ayes: number
          ai_question_1_noes: number
          ai_question_2: string
          ai_question_2_topic: string
          ai_question_2_ayes: number
          ai_question_2_noes: number
          ai_question_3: string
          ai_question_3_topic: string
          ai_question_3_ayes: number
          ai_question_3_noes: number
          speaker_count: number
          contribution_count: number
          party_count: Json
          interest_score: number | null
          interest_factors: Json | null
          engagement_count: number
        }[]
      }
      get_most_recent_debate_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_previous_debate_date: {
        Args: {
          input_date: string
        }
        Returns: string
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      remove_ai_chat:
        | {
            Args: {
              thread_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              user_id: string
              thread_id: string
            }
            Returns: undefined
          }
      search_chats: {
        Args: {
          debate_types?: string[]
          search_term?: string
          search_title?: boolean
          search_tag?: boolean
          search_speaker?: boolean
          search_category?: boolean
          last_id?: string
          limit_val?: number
          selected_date?: string
        }
        Returns: {
          id: string
          title: string
          subtitle: string
          speaker_ids: string[]
          speeches: Json
          rewritten_speeches: Json
          analysis: string
          labels: Json
          speechesparallel: boolean
          speaker_names: string[]
          extracts: Json
          proposing_minister: string
          category: string
          debate_type: string
        }[]
      }
      search_chats_alt: {
        Args: {
          debate_types?: string[]
          search_term?: string
          search_title?: boolean
          search_tag?: boolean
          search_speaker?: boolean
          search_category?: boolean
          search_speeches?: boolean
          last_id?: string
          limit_val?: number
          selected_date?: string
          fetch_previous_day?: boolean
        }
        Returns: {
          id: string
          title: string
          subtitle: string
          speaker_ids: string[]
          speeches: Json
          rewritten_speeches: Json
          analysis: string
          topics: string[]
          tags: string[]
          speechesparallel: boolean
          speaker_names: string[]
          extracts: Json
          proposing_minister: string
          category: string
          debate_type: string
        }[]
      }
      search_debate: {
        Args: {
          table_name: string
          debate_type_param: string
          debate_types: string[]
          search_term: string
          search_title: boolean
          search_tag: boolean
          search_speaker: boolean
          search_category: boolean
          search_speeches: boolean
        }
        Returns: {
          id: string
          title: string
          subtitle: string
          speaker_ids: string[]
          speeches: Json
          rewritten_speeches: Json
          analysis: string
          topics: string[]
          tags: string[]
          speechesparallel: boolean
          speaker_names: string[]
          extracts: Json
          proposing_minister: string
          category: string
          debate_type: string
        }[]
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
      submit_debate_vote: {
        Args: {
          p_debate_id: string
          p_question_number: number
          p_vote: boolean
        }
        Returns: undefined
      }
      get_unvoted_debates_with_engagement: {
        Args: {
          p_user_id: string
          p_limit: number
          p_cursor?: string
        }
        Returns: {
          id: string
          title: string
          date: string
          type: string
          house: string
          location: string
          ai_title: string | null
          ai_summary: string
          ai_tone: string | null
          ai_topics: Json
          ai_tags: Json
          ai_key_points: Json
          ai_question_1: string
          ai_question_1_topic: string
          ai_question_1_ayes: number
          ai_question_1_noes: number
          ai_question_2: string
          ai_question_2_topic: string
          ai_question_2_ayes: number
          ai_question_2_noes: number
          ai_question_3: string
          ai_question_3_topic: string
          ai_question_3_ayes: number
          ai_question_3_noes: number
          speaker_count: number
          contribution_count: number
          party_count: Json
          interest_score: number | null
          interest_factors: Json | null
          engagement_count: number
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
