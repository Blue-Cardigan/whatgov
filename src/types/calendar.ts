export type Day = Date | null;

export interface TimeInfo {
  substantive: string | null;
  topical: string | null;
  deadline: string;
}

export interface TimeSlot {
  type: 'oral-questions' | 'edm' | 'bill' | 'event';
  department?: string;
  minister?: {
    MnisId: number;
    PimsId: number;
    Name: string;
    ListAs: string;
    Constituency: string;
    Status: string;
    Party: string;
    PartyId: number;
    PartyColour: string;
    PhotoUrl?: string;
  };
  ministerTitle?: string;
  questions?: {
    id: number;
    UIN: number;
    text: string;
    askingMembers: {
      Name: string;
      Constituency: string;
      Party: string;
      PhotoUrl?: string;
    }[];
  }[];
  edm?: {
    id: number;
    UIN?: number;
    Title: string;
    Text: string;
    PrimarySponsor: {
      Name: string;
      PhotoUrl?: string;
      Party?: string;
    };
    DateTabled: string;
  };
  time?: TimeInfo;
  event?: WhatsOnEvent;
}

export interface DaySchedule {
  date: Date;
  timeSlots: TimeSlot[];
}


export interface MemberForDate {
    MnisId: number;
    PimsId: number;
    Name: string;
    ListAs: string;
    Constituency: string;
    Status: string;
    Party: string;
    PartyId: number;
    PartyColour: string;
    PhotoUrl?: string;
  }
  
  export interface PublishedEarlyDayMotion {
    Id: number;
    Status: 'Published' | 'Withdrawn';
    StatusDate: string;
    MemberId: number;
    PrimarySponsor: MemberForDate;
    Title: string;
    MotionText: string;
    AmendmentToMotionId?: number;
    UIN: number;
    AmendmentSuffix?: string;
    DateTabled: string;
    Sponsors: Array<{
      Id: number;
      MemberId: number;
      Member: MemberForDate;
      SponsoringOrder: number;
      CreatedWhen: string;
      IsWithdrawn: boolean;
      WithdrawnDate?: string;
    }>;
    SponsorsCount: number;
  }
  
  export interface PublishedOralQuestion {
    Id: number;
    QuestionType: 'Substantive' | 'Topical';
    QuestionText: string;
    Status: string;
    Number: number;
    TabledWhen: string;
    RemovedFromToBeAskedWhen?: string;
    DeclarableInterestDetail?: string;
    HansardLink: string;
    UIN: number;
    AnsweringWhen: string;
    AnsweringBodyId: number;
    AnsweringBody: string;
    AnsweringMinisterTitle: string;
    AskingMember: MemberForDate;
    AnsweringMinister: MemberForDate;
    AskingMemberId: number;
    AnsweringMinisterId: number;
  }
  
  export interface PublishedOralQuestionTime {
    Id: number;
    AnsweringWhen: string;
    DeadlineWhen: string;
    SubstantiveTime?: string;
    TopicalTime?: string;
    AnsweringBodyNames: string;
    AnsweringMinisterTitles: string;
  }
  
  export interface ApiResponse<T> {
    PagingInfo?: {
      Skip: number;
      Take: number;
      Total: number;
    };
    StatusCode: string;
    Success: boolean;
    Errors?: string[];
    Response: T;
  }
  
  export interface PublishedBill {
    billId: number;
    title?: string;
    shortTitle?: string;
    longTitle: string;
    currentHouse: 'Commons' | 'Lords';
    originatingHouse: 'Commons' | 'Lords';
    lastUpdate: string;
    isAct: boolean;
    isDefeated: boolean;
    billWithdrawn?: string | null;
    summary?: string | null;
    sponsors: Array<{
      member?: {
        memberId: number;
        name: string;
        party: string;
        partyColour: string;
        house: 'Commons' | 'Lords';
        memberPhoto?: string;
        memberPage?: string;
        memberFrom: string;
      };
      organisation?: {
        name: string;
        url: string;
      };
      sortOrder: number;
    }>;
    currentStage: {
      id: number;
      stageId: number;
      sessionId: number;
      description: string;
      abbreviation: string;
      house: 'Commons' | 'Lords';
      sortOrder: number;
      stageSittings?: Array<{
        id: number;
        stageId: number;
        billStageId: number;
        billId: number;
        date: string;
      }>;
    };
  }
  
  export interface PublishedBillSitting {
    id: number;
    stageId: number;
    billId: number;
    date: string;
    time?: string;
  }
  
export interface HansardData {
  earlyDayMotions: PublishedEarlyDayMotion[];
  oralQuestions: PublishedOralQuestion[];
  questionTimes: PublishedOralQuestionTime[];
  events: WhatsOnEvent[];
}

export interface WhatsOnEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime?: string;
  category?: string;
  type?: string;
  house?: string;
  members?: Array<{
    name: string;
    party: string;
    partyColour: string;
    constituency: string;
    photoUrl?: string;
  }>;
}

export interface BillTimeSlot {
  id: number;
  title: string;
  longTitle: string;
  summary?: string;
  currentHouse: 'Commons' | 'Lords';
  originatingHouse: 'Commons' | 'Lords';
  isAct: boolean;
  isDefeated: boolean;
  sponsors: PublishedBill['sponsors'];
  currentStage?: PublishedBill['currentStage'];
  stage: number;
  sittings?: PublishedBillSitting[];
}