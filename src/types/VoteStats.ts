// Update the interfaces
export interface TopicQuestion {
  text: string;
  topic: string;
  aye_votes: number;
  no_votes: number;
}

export interface TopicDetails {
  tags: string[];
  question_1: TopicQuestion;
  question_2: TopicQuestion;
  question_3: TopicQuestion;
  speakers: string[];
}

export interface TopicStats {
  total_votes: number;
  aye_votes: number;
  no_votes: number;
  top_questions?: TopQuestion[];
  vote_history?: VoteHistoryEntry[];
  speakers?: string[];
  frequency?: number;
  subtopics?: string[];
}

export interface VoteHistoryEntry {
  vote: boolean;
  title: string;
  topic: string;
  question: string;
  debate_id: string;
  created_at: string;
}

export interface TopicVoteStats {
  topics: {
    [key: string]: TopicStats;
  };
}

export interface UserTopicVotes {
  user_topics: {
    [topic: string]: TopicStats;
  };
}

export interface TopicVotes {
  [topic: string]: {
    no_votes: number;
    aye_votes: number;
    total_votes: number;
    vote_history?: VoteHistoryEntry[];
  };
}

// Add these new interfaces
export interface ChartData {
  timestamp: string;
  Ayes: number;
  Noes: number;
}

export interface VoteData {
  debate_id: string;
  question_number: number;
  vote: boolean;
  timestamp: string;
}

export interface TopicVoteStatsResponse {
  topics: {
    [topic: string]: TopicStats;
  };
}

export interface UserTopicVotesResponse {
  user_topics: {
    [topic: string]: UserTopicStats;
  };
}

export interface UserTopicStats extends TopicStats {
  vote_history: VoteHistoryEntry[];
}

export interface TopicQuestionStats {
  question: string;
  aye_votes: number;
  no_votes: number;
  total_votes: number;
}

export interface TopQuestion {
  question: string;  // This is now the debate title
  ayes: number;
  noes: number;
  total_votes: number;
}
