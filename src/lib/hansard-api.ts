const HANSARD_API_BASE = 'https://hansard-api.parliament.uk';

export interface HansardApiConfig {
  format: 'json';
  house: 'Commons' | 'Lords';
  date?: string;
  section?: string;
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
        groupByOwner: 'true'
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

  static async getDebatesList(date: string) {
    try {
      const data = await this.fetchSectionTrees({
        format: 'json',
        house: 'Commons',
        date,
        section: 'Debate'
      });

      if (!Array.isArray(data)) {
        console.error('Unexpected data format:', data);
        return [];
      }

      const sectionTreeItems = data[0]?.SectionTreeItems || [];
      
      return sectionTreeItems.filter((item: any) => 
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

  static async getDebateDetails(debateSectionExtId: string, supabaseClient: any) {
    try {
      const [debate, speakers, { data: generated, error: dbError }] = await Promise.all([
        this.fetchDebate(debateSectionExtId),
        this.fetchSpeakers(debateSectionExtId),
        supabaseClient
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