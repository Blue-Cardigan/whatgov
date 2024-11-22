// Core Question Types
export interface TopicQuestion {
  text: string;
  topic: string;
  aye_votes: number;
  no_votes: number;
}

// Core Stats Types
interface BaseStats {
  total_votes: number;
  aye_votes: number;
  no_votes: number;
}

export interface TopQuestion extends BaseStats {
  question: string;  // debate title
}

export interface TopicStats {
  topics: Record<string, TopicStatsEntry>;
}

export interface TopicStatsEntry extends BaseStats {
  top_questions: TopQuestion[];
  vote_history: VoteHistoryEntry[];
  speakers: string[];
  frequency: number;
  subtopics: string[];
}

// Vote History Types
export interface VoteHistoryEntry {
  vote: boolean;
  title: string;
  topic: string;
  question: string;
  debate_id: string;
  created_at: string;
}

export interface VoteData {
  debate_id: string;
  question_number: number;
  vote: boolean;
  timestamp: string;
}

// Chart Data Types
export interface ChartData {
  timestamp: string;
  Ayes: number;
  Noes: number;
}

// Response Types
export interface TopicVoteStatsResponse {
  topics: Record<string, TopicStats>;
}

export interface UserTopicVotesResponse {
  user_topics: Record<string, UserTopicStats>;
}

export interface UserTopicStats {
  user_topics: Record<string, UserTopicStatsEntry>;
}

// Demographic Types
export interface DemographicGroup {
  total_votes: number;
  aye_percentage: number;
}

export interface ConstituencyStats {
  total_votes: number;
  aye_votes: number;
  no_votes: number;
}

export interface DemographicStats {
  userDemographics: {
    constituency?: string;
    gender?: string;
    age_group?: string;
  };
  gender_breakdown: Record<string, DemographicGroup>;
  age_breakdown: Record<string, DemographicGroup>;
  constituency_breakdown: Record<string, ConstituencyStats>;
}

export interface UserTopicStatsEntry extends BaseStats {
  top_questions?: TopQuestion[];
  vote_history?: VoteHistoryEntry[];
  speakers?: string[];
  frequency?: number;
  subtopics?: string[];
}

// Raw Response Types
export interface RawTopicStats {
  topics: Record<string, {
    total_votes: string | number;
    aye_votes: string | number;
    no_votes: string | number;
    frequency?: number;
    top_questions?: Array<{
      question: string;
      ayes: string | number;
      noes: string | number;
    }>;
    vote_history?: Array<{
      vote: boolean;
      title: string;
      topic: string;
      question: string;
      debate_id: string;
      created_at: string;
    }>;
    speakers?: string[];
    subtopics?: string[];
  }>;
}

export interface RawUserVotingStats {
  totalVotes: number;
  userAyeVotes: number;
  userNoVotes: number;
  topic_stats: Record<string, {
    total: number;
    ayes: number;
    noes: number;
    subtopics: unknown[];
    details: Array<{
      tags: string[];
      question_1: { text: string; topic: string; ayes: number; noes: number; };
      question_2: { text: string; topic: string; ayes: number; noes: number; };
      question_3: { text: string; topic: string; ayes: number; noes: number; };
      speakers: string[];
    }>;
    frequency: number[];
  }>;
  vote_stats: Array<{
    timestamp: string;
    userAyes: number;
    userNoes: number;
    topicVotes: Record<string, { ayes: number; noes: number; }>;
  }>;
}

export interface RawDemographicStats {
  user_demographics: {
    constituency?: string;
    gender?: string;
    age_group?: string;
  };
  gender_breakdown: Record<string, {
    total_votes: string | number;
    aye_percentage: string | number;
  }>;
  age_breakdown: Record<string, {
    total_votes: string | number;
    aye_percentage: string | number;
  }>;
  constituency_breakdown: Record<string, {
    total_votes: string | number;
    aye_votes: string | number;
    no_votes: string | number;
  }>;
}

export interface TopicWithName extends TopicStatsEntry {
  name: string;
  engagement_score: number;
  agreement_rate: number;
  consistency_score: number;
}

