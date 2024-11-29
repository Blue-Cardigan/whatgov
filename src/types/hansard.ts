export interface HansardDebateResponse {
  Overview: {
    Id: number;
    ExtId: string;
    Title: string;
    HRSTag: string;
    Date: string;
    Location: string;
    House: string;
    Source: number;
    VolumeNo: number;
    ContentLastUpdated: string;
    DebateTypeId: number;
    SectionType: number;
    NextDebateExtId: string;
    NextDebateTitle: string;
    PreviousDebateExtId: string;
    PreviousDebateTitle: string;
  };
  Navigator: HansardNavigatorItem[];
  Items: HansardContribution[];
  ChildDebates: string[]; // Usually empty array
}

export interface HansardNavigatorItem {
  Id: number;
  Title: string;
  ParentId: number | null;
  SortOrder: number;
  ExternalId: string;
  HRSTag: string | null;
  HansardSection: string | null;
  Timecode: string | null;
}

export interface HansardContribution {
  ItemType: 'Contribution';
  ItemId: number;
  MemberId: number | null;
  AttributedTo: string | null;
  Value: string;
  OrderInSection: number;
  Timecode: string | null;
  ExternalId: string | null;
  HRSTag: string;
  HansardSection: string | null;
  UIN: string | null;
  IsReiteration: boolean;
} 