
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