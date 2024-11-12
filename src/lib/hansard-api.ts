import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const HANSARD_API_BASE = 'https://hansard-api.parliament.uk';

export interface HansardApiConfig {
  format: 'json';
  house: 'Commons' | 'Lords';
  date?: string;
  section?: string;
}

interface SectionTreeItem {
  Id: number;
  Title: string;
  ParentId: number | null;
  SortOrder: number;
  ExternalId: string;
  HRSTag: string | null;
  HansardSection: string | null;
  Timecode: string | null;
}

export class HansardAPI {
  private static async fetchWithErrorHandling(url: string) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  static async fetchSectionTrees(config: HansardApiConfig) {
    const url = `${HANSARD_API_BASE}/overview/sectiontrees.${config.format}?` + 
      new URLSearchParams({
        house: config.house,
        date: config.date!,
        section: config.section!,
        // groupByOwner: 'true'
      });

    return this.fetchWithErrorHandling(url);
  }

  static async fetchDebate(debateSectionExtId: string) {
    const url = `${HANSARD_API_BASE}/debates/debate/${debateSectionExtId}.json`;
    return this.fetchWithErrorHandling(url);
  }

  static async fetchSpeakers(debateSectionExtId: string) {
    const url = `${HANSARD_API_BASE}/debates/speakerslist/${debateSectionExtId}.json`;
    return this.fetchWithErrorHandling(url);
  }

  static async getLastSittingDate(house?: 'Commons' | 'Lords'): Promise<string> {
    if (house) {
      const url = `${HANSARD_API_BASE}/overview/lastsittingdate.json?` +
        new URLSearchParams({ house });
      const response = await this.fetchWithErrorHandling(url);
      return response as string;
    }

    // Fetch both houses in parallel
    const [commonsDate, lordsDate] = await Promise.all([
      this.getLastSittingDate('Commons'),
      this.getLastSittingDate('Lords')
    ]);

    // Return the most recent date
    return new Date(commonsDate) > new Date(lordsDate) ? commonsDate : lordsDate;
  }

  static async getDebatesList(date?: string, house: 'Commons' | 'Lords' = 'Commons') {
    try {
      const targetDate = date || await this.getLastSittingDate();

      const data = await this.fetchSectionTrees({
        format: 'json',
        house,
        date: targetDate,
        section: 'Debate'
      });

      if (!Array.isArray(data)) {
        console.error('Unexpected data format:', data);
        return [];
      }

      const sectionTreeItems = data[0]?.SectionTreeItems || [];
      
      return sectionTreeItems.filter((item: SectionTreeItem) => 
        item.HRSTag?.includes('Question') || 
        item.HRSTag?.includes('Debate') ||
        item.HRSTag?.includes('Motion') ||
        item.HRSTag?.includes('UrgentQuestion')
      );
    } catch (error) {
      console.error('Failed to get debates list:', error);
      return [];
    }
  }

  static async getDebateDetails(debateSectionExtId: string) {
    try {
      const [debate, speakers, { data: generated, error: dbError }] = await Promise.all([
        this.fetchDebate(debateSectionExtId),
        this.fetchSpeakers(debateSectionExtId),
        supabase
          .from('debate_generated_content')
          .select('*')
          .eq('debate_section_ext_id', debateSectionExtId)
      ]);

      if (dbError) throw dbError;

      return { 
        debate, 
        speakers, 
        generated: generated || [] 
      };
    } catch (error) {
      console.error('Failed to get debate details:', error);
      throw error;
    }
  }
}