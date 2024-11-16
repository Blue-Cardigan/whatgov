import { Json } from "./supabase";

// Update the interfaces
export interface TopicQuestion {
  text: string;
  topic: string;
  ayes: number;
  noes: number;
}

export interface TopicDetails {
  tags: string[];
  question_1: TopicQuestion;
  question_2: TopicQuestion;
  question_3: TopicQuestion;
  speakers: string[];
}

export interface TopicStats {
  total: number;
  ayes: number;
  noes: number;
  subtopics: string[];
  details: TopicDetails[];
  frequency: number;
}

export interface UserVotingStats {
  totalVotes: number;
  ayeVotes: number;
  noVotes: number;
  topicStats: {
    [topic: string]: TopicStats;
  };
  weeklyStats: VoteStatsEntry[];
}

export interface VoteHistoryEntry {
    vote: boolean;
    created_at: string;
    debates: {
      ai_topics: Json;
    };
  }

export interface TopicStatsRaw {
  total: number;
  ayes: number;
  noes: number;
  subtopics?: string[];
  details?: Array<{
        tags?: string[];
        question_1?: {
        text?: string;
        topic?: string;
        ayes?: number;
        noes?: number;
        };
        question_2?: {
        text?: string;
        topic?: string;
        ayes?: number;
        noes?: number;
        };
        question_3?: {
        text?: string;
        topic?: string;
        ayes?: number;
        noes?: number;
        };
        speakers?: string[];
    }>;
    frequency?: number[];
}

export interface WeeklyStatsRaw {
  week: string;
  ayes: number;
  noes: number;
}

export interface VoteStatsEntry {
  timestamp: string;
  ayes: number;
  noes: number;
}
