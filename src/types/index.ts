import { LucideIcon } from "lucide-react";

export interface FeedItem {
    id: string;
    ext_id: string;
    title: string;
    date: string;
    location: string;
    type: string;
    ai_title: string;
    ai_summary: string;
    ai_tone: 'neutral' | 'contentious' | 'collaborative';
    ai_tags: string[];
    ai_key_points: KeyPoint[];
    ai_topics: AiTopics;
    ai_comment_thread: CommentThread[]; 
    speaker_count: number;
    speakers: string[];
    contribution_count: number;
    party_count: PartyCount;

    interest_score: number;
    interest_factors: InterestFactors;
    engagement_count: number;

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
    divisions?: Division[];
  }

export interface PartyCount {
  Conservative?: number;
  Labour?: number;
  "Liberal Democrat"?: number;
  "Scottish National Party"?: number;
  Other?: number;
  [key: string]: number | undefined;
}

export type KeyPoint = {
  point: string;
  speaker: string;
  support: string[];
  opposition: string[];
  speaker_details?: {
    member_id: number;
    display_as: string;
    party: string;
    constituency: string;
    image_url: string | null;
  };
}

export interface InterestFactors {
  diversity: number;
  discussion: number;
  controversy: number;
  participation: number;
}

export interface AiTopic {
  name: string;
  speakers: string[];
  frequency: number;
  subtopics: string[];
}

export type AiTopics = AiTopic[];

export interface DebateVote {
  debate_id: string;
  question_number: number;
  vote: boolean;
}

export interface EngagementCount {
  engagement_count: number | null;
}

export interface Division {
  division_id: number;
  external_id: string;
  date: string;
  time: string | null;
  ayes_count: number;
  noes_count: number;
  division_number: string | null;
  ai_question: string | null;
  ai_topic: string | null;
  ai_context: string | null;
  ai_key_arguments: {
    for: string;
    against: string;
  } | null;
  aye_members: Array<{
    name: string;
    party: string;
    member_id: number;
  }> | null;
  noe_members: Array<{
    name: string;
    party: string;
    member_id: number;
  }> | null;
}

// Add shared types
export interface BaseContentProps {
  isActive?: boolean;
  readOnly?: boolean;
  hasReachedLimit?: boolean;
}

export interface VoteHandlers {
  onVote: (num: number, vote: boolean) => void;
  onSkip: (num: number) => void;
}

export interface CommentVotes {
  upvotes: number;
  downvotes: number;
  upvotes_speakers: string[];
  downvotes_speakers: string[];
}

export interface CommentThread {
  id: string;
  tags: string[];
  party: string;
  votes: CommentVotes;
  author: string;
  content: string;
  parent_id: string | null;
}

// First, let's separate the filter types
type ArrayFilterId = 'location' | 'type' | 'days' | 'topics';
type BooleanFilterId = 'mpOnly' | 'divisionsOnly';

// Create a union type for all filter IDs
export type FilterId = ArrayFilterId | BooleanFilterId;

// Define the shape of array filter values
type ArrayFilterValue = {
  [K in ArrayFilterId]: string[];
};

// Define the shape of boolean filter values
type BooleanFilterValue = {
  [K in BooleanFilterId]: boolean;
};

// Combine them into the final FeedFilters type
export interface FeedFilters extends ArrayFilterValue, BooleanFilterValue {
  house: string[]; // Keep house separate as it's handled differently
}

// Define base properties for all filter items
interface BaseFilterItem {
  id: FilterId;
  icon: LucideIcon;
  label: string;
  tier: 'premium' | 'basic';
  description: string;
}

// Specific type for array filters
export interface ArrayFilterItem extends BaseFilterItem {
  id: ArrayFilterId;
  type: 'array';
  options: Array<{
    value: string;
    label: string;
    icon?: LucideIcon;
    color?: string;
  }>;
}

// Specific type for boolean filters
export interface BooleanFilterItem extends BaseFilterItem {
  id: BooleanFilterId;
  type: 'boolean';
}

// Union type for all filter items
export type FilterItem = ArrayFilterItem | BooleanFilterItem;