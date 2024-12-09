import { SupabaseClient } from '@supabase/supabase-js';
import { TOPIC_DEFINITIONS, LOCATION_GROUPS, DEBATE_TYPES, partyColours } from '@/lib/utils';
import { SearchFilterParams } from '@/types/assistant';

export type SearchFilter = {
  id: string;
  user_id: string;
  name: string;
  keywords: string[];
  members: string[];
  members_filter_type: 'inclusive' | 'exclusive';
  subtopics: string[];
  subtopics_filter_type: 'inclusive' | 'exclusive';
  house: 'Commons' | 'Lords' | 'Both';
  debate_types: string[];
  debate_types_filter_type: 'inclusive' | 'exclusive';
  date_from: string | null;
  date_to: string | null;
  days_of_week: string[];
  parties: string[];
  parties_filter_type: 'inclusive' | 'exclusive';
  created_at: string;
  updated_at: string;
};

type SearchFilterInput = Omit<SearchFilter, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export class AssistantQueryBuilder {
  constructor(private supabase: SupabaseClient) {}

  async saveFilter(userId: string, filter: SearchFilterInput): Promise<SearchFilter | null> {
    const { data, error } = await this.supabase
      .from('assistants')
      .insert({
        user_id: userId,
        ...filter
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving search filter:', error);
      return null;
    }

    return data;
  }

  async getFilters(userId: string): Promise<SearchFilter[]> {
    const { data, error } = await this.supabase
      .from('assistants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching search filters:', error);
      return [];
    }

    return data;
  }

  async deleteFilter(filterId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('assistants')
      .delete()
      .eq('id', filterId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting search filter:', error);
      return false;
    }

    return true;
  }

  async searchMembers(query: string): Promise<Array<{ member_id: number, display_as: string }>> {
    const { data, error } = await this.supabase
      .from('members')
      .select('member_id, display_as')
      .ilike('display_as', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching members:', error);
      return [];
    }

    return data;
  }

  async getKeywords(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('mp_key_points')
      .select('point')
      .limit(1000);

    if (error) {
      console.error('Error fetching keywords:', error);
      return [];
    }

    // Extract unique words from points and filter common words
    const stopWords = new Set(['the', 'and', 'or', 'in', 'to', 'a', 'of', 'for']);
    const words = new Set(
      data
        .flatMap(row => row.point?.toLowerCase().split(/\W+/))
        .filter(word => word && word.length > 3 && !stopWords.has(word))
    );

    return Array.from(words).sort();
  }

  async getMatchingDebates(filter: SearchFilterParams) {
    const { data, error } = await this.supabase
      .rpc('get_matching_debates', {
        p_members: filter.members,
        p_members_filter_type: filter.members_filter_type,
        p_parties: filter.parties,
        p_parties_filter_type: filter.parties_filter_type,
        p_subtopics: filter.subtopics,
        p_subtopics_filter_type: filter.subtopics_filter_type,
        p_house: filter.house,
        p_debate_types: filter.debate_types,
        p_date_from: filter.date_from,
        p_date_to: filter.date_to,
        p_days_of_week: filter.days_of_week
      });

    if (error) {
      console.error('Error getting matching debates:', error);
      throw error;
    }

    return data;
  }

  async getAssistant(assistantId: string): Promise<{
    id: string;
    name: string;
    description: string;
    prompt_type: string;
    keywords: string[];
    filters: {
      members: Array<{
        member_id: number;
        memberId: string;
        name: string;
        display_as: string;
        party: string;
        constituency?: string;
      }>;
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
    openai_assistant_id: string;
    vector_store_id: string | null;
    file_ids: string[];
  } | null> {
    // First get the assistant data
    const { data: assistant, error } = await this.supabase
      .from('assistants')
      .select(`
        id,
        name,
        description,
        prompt_type,
        keywords,
        filters,
        openai_assistant_id,
        vector_store_id,
        file_ids
      `)
      .eq('id', assistantId)
      .single();

    if (error) {
      console.error('Error fetching assistant:', error);
      return null;
    }

    // Then fetch member details if there are members in filters
    let members: Array<{
      member_id: number;
      memberId: string;
      name: string;
      display_as: string;
      party: string;
      constituency?: string;
    }> = [];

    if (assistant.filters?.members?.length > 0) {
      const { data: memberData, error: memberError } = await this.supabase
        .from('members')
        .select('member_id, display_as, party, constituency')
        .in('member_id', assistant.filters.members);

      if (!memberError && memberData) {
        members = memberData.map(member => ({
          member_id: member.member_id,
          memberId: member.member_id.toString(),
          name: member.display_as,
          display_as: member.display_as,
          party: member.party,
          constituency: member.constituency
        }));
      }
    }

    const filters = assistant.filters || {};

    // Ensure keywords is always an array
    const keywords = Array.isArray(assistant.keywords) ? assistant.keywords : [];

    return {
      id: assistant.id,
      name: assistant.name,
      description: assistant.description,
      prompt_type: assistant.prompt_type,
      keywords: keywords,
      filters: {
        members,
        members_filter_type: filters.members_filter_type || 'inclusive',
        parties: filters.parties || [],
        parties_filter_type: filters.parties_filter_type || 'inclusive',
        subtopics: filters.subtopics || [],
        subtopics_filter_type: filters.subtopics_filter_type || 'inclusive',
        house: filters.house || 'Both',
        debate_types: filters.debate_types || [],
        debate_types_filter_type: filters.debate_types_filter_type || 'inclusive',
        date_from: filters.date_from,
        date_to: filters.date_to,
        days_of_week: filters.days_of_week || []
      },
      openai_assistant_id: assistant.openai_assistant_id,
      vector_store_id: assistant.vector_store_id,
      file_ids: assistant.file_ids || []
    };
  }

  async updateAssistant(assistantId: string, data: {
    name: string;
    description: string;
    prompt_type: string;
    keywords: string[];
    filters: {
      members: number[];
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
  }): Promise<boolean> {
    const { error } = await this.supabase
      .from('assistants')
      .update({
        name: data.name,
        description: data.description,
        prompt_type: data.prompt_type,
        keywords: data.keywords,
        filters: data.filters,
        updated_at: new Date().toISOString()
      })
      .eq('id', assistantId);

    if (error) {
      console.error('Error updating assistant:', error);
      return false;
    }

    return true;
  }

  async getAssistantFiles(assistantId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('assistants')
      .select('file_ids')
      .eq('id', assistantId)
      .single();

    if (error) {
      console.error('Error fetching assistant files:', error);
      return [];
    }

    return data.file_ids || [];
  }

  async updateAssistantFiles(assistantId: string, fileIds: string[]): Promise<boolean> {
    const { error } = await this.supabase
      .from('assistants')
      .update({ file_ids: fileIds })
      .eq('id', assistantId);

    if (error) {
      console.error('Error updating assistant files:', error);
      return false;
    }

    return true;
  }
}

// Export constants for the UI
export const FILTER_OPTIONS = {
  houses: ['Commons', 'Lords', 'Both'] as const,
  locations: LOCATION_GROUPS,
  debateTypes: DEBATE_TYPES,
  daysOfWeek: [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ] as const,
  parties: Object.keys(partyColours),
  topics: Object.entries(TOPIC_DEFINITIONS).flatMap(([category, subtopics]) => 
    subtopics.map(topic => ({ category, topic }))
  )
}; 