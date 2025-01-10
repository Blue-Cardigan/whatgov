import type { KeyPoint, Speaker } from "@/types";

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
  currentHouse: 'Commons' | 'Lords';
  originatingHouse: 'Commons' | 'Lords';
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
    startDate?: string;
    endDate?: string;
    house?: 'Commons' | 'Lords';
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

export interface SavedSearch {
  id: string;
  user_id: string;
  query: string;
  response: string;
  citations: Citation[];
  created_at: string;
  search_type: 'ai' | 'hansard' | 'mp' | 'question';
  query_state?: {
    parts?: string;
    startDate?: string;
    endDate?: string;
    house?: 'Commons' | 'Lords';
    enableAI?: boolean;
  };
  metadata?: {
    questionId?: string;
    department?: string;
    deadline?: string;
    [key: string]: any;
  };
  mp_data?: MPSearchData;
}


export interface SearchDirectives {
    spokenBy?: string;
    debate?: string;
    words?: string;
    exact?: string;
} 


export interface HansardApiConfig {
    format: 'json';
    house: 'Commons' | 'Lords';
    date?: string;
    section?: string;
}
  
export interface SearchParams {
    searchTerm?: string;
    house?: 'Commons' | 'Lords';
    orderBy?: 'SittingDateAsc' | 'SittingDateDesc';
    startDate?: string;
    endDate?: string;
    spokenBy?: string;
    memberId?: number;
    memberIds?: number[];
    divisionId?: number;
    seriesNumber?: number;
    volumeNumber?: number;
    columnNumber?: string;
    section?: number;
    debateSectionId?: number;
    skip?: number;
    take?: number;
    enableAI?: boolean;
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
    aiContent?: Record<string, SearchResultAIContent>;
}


export interface SearchResultAIContent {
    id: string;
    ext_id: string;
    title: string;
    ai_title?: string;
    date: string;
    type: string;
    house: string;
    location: string;
    ai_summary?: string;
    ai_key_points?: KeyPoint[];
    speaker_count?: number;
    party_count?: Record<string, number>;
    speakers?: Speaker[];
}
  
export interface Member {
    MemberId: number;
    DodsId: number;
    PimsId: number;
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