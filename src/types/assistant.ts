export interface StreamResponse {
  text: string;
  citations: Array<{ citation_index: number; debate_id: string; chunk_text: string }>;
}

export interface AssistantResponse {
  threadId: string;
  response: string;
}

export interface AssistantCreateRequest {
  name: string;
  description: string;
  userId: string;
  filters: {
    keywords: string[];
    members: string[];
    members_filter_type: 'inclusive' | 'exclusive';
    parties: string[];
    parties_filter_type: 'inclusive' | 'exclusive';
    subtopics: string[];
    subtopics_filter_type: 'inclusive' | 'exclusive';
    house: 'Commons' | 'Lords' | 'Both';
    debate_types: string[];
    debate_types_filter_type: 'inclusive' | 'exclusive';
    date_from: string | null;
    date_to: string | null;
    days_of_week: string[];
  };
}

// Update Assistant interface to match database schema
export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  description: string;
  filters: SearchFilterParams;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  vector_store_id: string | null;
  openai_assistant_id: string | null;
  file_ids: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  keywords: string[] | null;
  prompt_type: string | null;
}

// Update SearchFilterParams to match database schema
export interface SearchFilterParams {
  members: {
    member_id: number;
    memberId: string;
    name: string;
    display_as: string;
    party: string;
    constituency?: string;
  }[];
  members_filter_type: 'inclusive' | 'exclusive';
  parties: string[];
  parties_filter_type: 'inclusive' | 'exclusive';
  subtopics: string[];
  subtopics_filter_type: 'inclusive' | 'exclusive';
  house: 'Commons' | 'Lords' | 'Both';
  debate_types: string[];
  debate_types_filter_type: 'inclusive' | 'exclusive';
  date_from: string | null;
  date_to: string | null;
  days_of_week: string[];
}

// Update SearchFilter to extend SearchFilterParams
export interface SearchFilter extends SearchFilterParams {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
} 