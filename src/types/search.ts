export interface Citation {
    citation_index: number;
    debate_id: string;
  }

export interface SearchState {
    searchParams: SearchParams;
    results: SearchResponse | null;
    isLoading: boolean;
    aiSearch: {
        query: string;
        streamingText: string;
        citations: Citation[];
        isLoading: boolean;
    };
    searchType?: 'ai' | 'hansard' | 'mp';
    mpSearch: MPSearchData;
}

export type SearchType = 'ai' | 'hansard' | 'mp' | 'question' | 'bill' | 'edm';

export interface BillQueryState {
  billId: number;
  title: string;
  currentHouse: 'commons' | 'lords';
  originatingHouse: 'commons' | 'lords';
  date: string;
  stage?: string;
}

export interface EDMQueryState {
  edmId: number;
  title: string;
  primarySponsor: string;
  date: string;
}

export interface SaveSearchParams {
  query: string;
  response: string;
  citations: string[];
  queryState?: {
    searchTerm: string;
    house?: 'commons' | 'lords';
    dateRange?: string;
    parts?: string[];
    skip?: number;
    take?: number;
  };
  searchType: 'ai' | 'hansard' | 'mp';
  repeat_on?: {
    frequency: 'weekly';
    dayOfWeek: number;
  } | null;
}

export interface SavedSearchSchedule {
  id: string;
  search_id: string;
  user_id: string;
  is_active: boolean;
  next_run_at: string;
  repeat_on: {
    frequency: 'daily' | 'weekly';
    dayOfWeek?: number;
  } | null;
  created_at: string;
}

export interface SavedSearchMetadata {
  questionId?: string;
  department?: string;
  deadline?: string;
  [key: string]: string | undefined;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  query: string;
  response: string;
  citations: string[];
  created_at: string;
  search_type: 'ai' | 'hansard' | 'mp' | 'question';
  is_unread: boolean;
  has_changed: boolean;
  query_state?: {
    parts?: string;
    startDate?: string;
    endDate?: string;
    house?: 'commons' | 'lords';
    enableAI?: boolean;
  };
  metadata?: SavedSearchMetadata;
  mp_data?: MPSearchData;
  saved_search_schedules?: SavedSearchSchedule[];
}


export interface SearchDirectives {
    spokenBy?: string;
    debate?: string;
    words?: string;
    exact?: string;
} 


export interface HansardApiConfig {
    format: 'json';
    house: 'commons' | 'lords';
    date?: string;
    section?: string;
}
  
export interface SearchParams {
    searchTerm: string;
    house?: 'Commons' | 'Lords';
    dateFrom?: string;
    dateTo?: string;
    skip?: number;
    take?: number;
    orderBy?: 'SittingDateAsc' | 'SittingDateDesc';
    type?: string;
    resultType?: 'all' | 'debates' | 'written-statements' | 'written-answers' | 'corrections' | 'divisions' | 'members';
}
  
export interface SearchResponse {
    TotalMembers: number;
    TotalContributions: number;
    TotalWrittenStatements: number;
    TotalWrittenAnswers: number;
    TotalCorrections: number;
    TotalPetitions: number;
    TotalDebates: number;
    TotalCommittees: number;
    TotalDivisions: number;
    SearchTerms: string[];
    Members: Member[];
    Contributions: Contribution[];
    WrittenStatements: Contribution[];
    WrittenAnswers: Contribution[];
    Corrections: Contribution[];
    Petitions: SearchDebateItem[];
    Debates: SearchDebateItem[];
    Divisions: SearchDebateItem[];
    Committees: SearchDebateItem[];
}
  
export interface Member {
    MemberId: number;
    DisplayAs: string;
    ListAs: string;
    FullTitle: string;
    LayingMinisterName: string;
    HistoricalMemberName: string;
    HistoricalFullTitle: string;
    Gender: string;
    Party: string;
    PartyId: number;
    House: string;
    MemberFrom: string;
    HouseStartDate: string;
    HouseEndDate: string;
    IsTeller: boolean;
    SortOrder: number;
    ConstituencyCountry: string;
}
  
export interface Contribution {
    MemberName: string;
    MemberId: number;
    AttributedTo: string;
    ItemId: number;
    ContributionExtId: string;
    ContributionText: string;
    HRSTag: string;
    HansardSection: string;
    Timecode: string | null;
    DebateSection: string;
    DebateSectionId: number;
    DebateSectionExtId: string;
    SittingDate: string;
    Section: string;
    House: string;
    OrderInDebateSection: number;
    DebateSectionOrder: number;
    Rank: number;
}
  
export interface MemberSearchResponse {
    Results: Member[];
    TotalResults: number;
    Skip: number;
    Take: number;
}
  

export interface DivisionOverview {
    DivisionId: number;
    Date: string;
    Number: number;
    House: string;
    Title: string;
    AyeCount: number;
    NoCount: number;
    Ayes: Member[];
    Noes: Member[];
    Rank?: number;
}

export interface SearchReferencesItem {
    MemberName: string;
    MemberId: number;
    AttributedTo: string;
    ItemId: number;
    ContributionExtId: string;
    ContributionText: string;
    HRSTag: string;
    HansardSection: string;
    Timecode: string | null;
    DebateSection: string;
    DebateSectionId: number;
    DebateSectionExtId: string;
    SittingDate: string;
    Section: string;
    House: string;
    OrderInDebateSection: number;
    DebateSectionOrder: number;
    Rank: number;
}

export interface SearchDebateItem {
    DebateSection: string;
    SittingDate: string;
    House: string;
    Title: string;
    DebateSectionExtId: string;
    Value: string;
}

export interface SearchCommitteeItem {
    House: string;
    Title: string;
    DebateSection: string;
}

export interface MPSearchData {
  query: string;
  mpId?: string;
  keywords: string[];
}

export interface SavedQuestionData {
  id: string;  // Unique identifier
  department: string;
  answeringDate: string;
  minister?: {
    MnisId: number;
    Name: string;
    Party: string;
  };
  ministerTitle?: string;
  question?: {
    text: string;
    askingMembers: Array<{
      Name: string;
      Party?: string;
      Constituency?: string;
    }>;
  };
  time?: {
    substantive: string | null;
    topical: string | null;
    deadline: string;
  };
  type: 'oral-question';
  savedAt: string;
}