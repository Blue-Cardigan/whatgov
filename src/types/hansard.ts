
export interface Debate {
    Id: number;
    ExternalId: string;
    Title: string;
    ParentId: number;
    SortOrder: number;
    HRSTag: string;
    HansardSection: string;
    Timecode: string | null;
}
  
export interface Speaker {
    id: string;
    name: string;
    party: string;
    image: string;
    constituency: string;
  }
  
export interface Contribution {
    id: string;
    speaker: Speaker;
    content: string;
    timestamp: string;
  }

  export interface SearchState {
    searchTerm: string;
    selectedDate?: Date;
    house: 'Commons' | 'Lords';
    topics: string[];
    parties: string[];
    spokenBy?: string;
    debateType?: string;
    sortOrder: 'SittingDateDesc' | 'SittingDateAsc';
    page: number;
  }
  
  export interface SearchDirectives {
    spokenBy?: string;
    debate?: string;
    words?: string;
    exact?: string;
  } 