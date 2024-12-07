import createClient from './client';
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
  private supabase = createClient();

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