import { MPData } from ".";

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
  queryState?: QueryState;
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
  query_state?: QueryState;
  metadata?: SavedSearchMetadata;
  mp_data?: MPSearchData;
  saved_search_schedules?: SavedSearchSchedule[];
}

export interface QueryState {
  house?: 'Commons' | 'Lords';
  dateRange?: string;
  date_from?: string;
  date_to?: string;
  member?: string;
  party?: string;
  mp?: string;
  firstDebate?: string;
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
    searchTerm: string;
    house?: 'Commons' | 'Lords';
    party?: string;
    member?: string;
    dateFrom?: string;
    dateTo?: string;
    skip?: number;
    take?: number;
    orderBy?: 'SittingDateAsc' | 'SittingDateDesc';
    type?: string;
    resultType?: 'all' | 'debates' | 'written-statements' | 'written-answers' | 'corrections' | 'divisions' | 'members';
}
  
export interface SearchResponse {
    TotalDebates: number;
    Debates: Debate[];
    TotalMembers?: number;
    TotalContributions?: number;
    Members?: Member[];
    Contributions?: Contribution[];
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
    debate_id?: string;
}

export interface SearchCommitteeItem {
    House: string;
    Title: string;
    DebateSection: string;
}

export interface MPSearchData {
  query: string;
  mpIds?: string[];
  keywords: string[];
  results: MPData[];
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

// Core debate interface that can be reused
export interface BaseDebate {
  ext_id: string;
  title: string;
  type: string;
  house: string;
  date: string;
  debate_id?: string;
  Value?: string;
  DebateSection?: string;
  SittingDate?: string;
  House?: string;
  Title?: string;
  DebateSectionExtId?: string;
}

// Extended debate interface with analysis
export interface Debate extends BaseDebate {
  analysis?: {
    outcome?: string;
    statistics?: Array<{
      value: string;
      context: string;
    }>;
    main_content?: string;
  };
  speaker_points?: Array<{
    name: string;
    role: string;
    party: string;
    contributions: string[];
  }>;
  relevance?: number;
}

// Component Props interfaces
export interface SearchResultsProps {
  results: SearchResponse;
  isLoading: boolean;
  searchParams: SearchParams;
  totalResults?: number;
}

export interface MPSearchResultsProps {
  results: MPData[];
  isLoading: boolean;
  isProfessional: boolean;
  searchTerm: string;
}

export interface MPDebate {
  debate_id: string;
  debate_title: string;
  debate_type: string;
  debate_house: string;
  debate_date: string;
  member_name: string;
  member_party: string;
  member_constituency: string;
  member_role: string;
  member_contributions: string[];
}

export interface ProfileDetailProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
}