export interface StreamResponse {
  text: string;
  citations: string[];
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

export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  description: string;
  filters: AssistantCreateRequest['filters'];
  status: 'pending' | 'processing' | 'ready' | 'failed';
  vector_store_id?: string;
  openai_assistant_id?: string;
  file_ids: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// New type for just the filter parameters
export interface SearchFilterParams {
    members: number[];
    members_filter_type: 'inclusive' | 'exclusive';
    parties: string[];
    parties_filter_type: 'inclusive' | 'exclusive';
    subtopics: string[];
    subtopics_filter_type: 'inclusive' | 'exclusive';
    house: 'Commons' | 'Lords' | 'Both';
    debate_types: string[]; // No filter type needed
    date_from: string | null;
    date_to: string | null;
    days_of_week: string[];
};

// Update SearchFilter to extend SearchFilterParams
export interface SearchFilter extends SearchFilterParams {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
} 