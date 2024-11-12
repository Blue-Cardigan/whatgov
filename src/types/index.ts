export interface FeedItem {
    id: string;
    ext_id: string;
    title: string;
    date: string;
    location: string;
    ai_title: string;
    ai_summary: string;
    ai_tone: 'neutral' | 'contentious' | 'collaborative';
    ai_tags: string[];
    ai_key_points: KeyPoint[];
    speaker_count: number;
    contribution_count: number;
    party_count: PartyCount;

    ai_question_1: string;
    ai_question_1_topic: string;
    ai_question_1_ayes: number;
    ai_question_1_noes: number;
    ai_question_2: string;
    ai_question_2_topic: string;
    ai_question_2_ayes: number;
    ai_question_2_noes: number;
    ai_question_3: string;
    ai_question_3_topic: string;
    ai_question_3_ayes: number;
    ai_question_3_noes: number;
  }

export interface PartyCount {
  [key: string]: number;
}

export interface KeyPoint {
  point: string;
  speaker: string;
  support: string[];
  opposition: string[];
}