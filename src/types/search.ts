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
    WrittenStatements: SearchReferencesItem[];
    WrittenAnswers: SearchReferencesItem[];
    Corrections: SearchReferencesItem[];
    Petitions: SearchDebateItem[];
    Debates: SearchDebateItem[];
    Divisions: DivisionOverview[];
    Committees: SearchCommitteeItem[];
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
  Rank: number;
  DebateSectionExtId: string;
}

export interface SearchCommitteeItem {
  House: string;
  Title: string;
  DebateSection: string;
}