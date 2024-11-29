
  // Add new interface for oral questions
  export interface OralQuestion {
    Id: number;
    QuestionText: string;
    AnsweringWhen: string;
    AnsweringBody: string;
    AnsweringMinisterTitle: string;
    AskingMember: {
      Name: string;
      Constituency: string;
      Party: string;
      PhotoUrl: string;
    };
    AnsweringMinister: {
      MnisId: number;
      PimsId: number;
      Name: string;
      ListAs: string;
      Constituency: string;
      Status: string;
      Party: string;
      PartyId: number;
      PartyColour: string;
      PhotoUrl: string;
    };
  }
  
  export interface OralQuestionsResponse {
    Success: boolean;
    Response: OralQuestion[];
    PagingInfo?: {
      Skip: number;
      Take: number;
      Total: number;
    };
  }
  