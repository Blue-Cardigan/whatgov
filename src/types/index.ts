import { LucideIcon } from "lucide-react";

// Add new types for better type safety
export interface FetchOptions {
  retries?: number;
  cacheTTL?: number;
  forceRefresh?: boolean;
}

export interface DebateItem {
    ext_id: string;
    title: string;
    date: string;
    house: string;
    type: string;
    analysis: string;
    speaker_points: string[];
  }

export interface Speaker {
  name: string;
  party: string;
  display_as: string;
  member_id: number;
  memberId?: string;
  constituency?: string;
}

export type MPData = {
  member_id: number;
  display_as: string;
  full_title: string;
  gender: string;
  party: string;
  constituency: string;
  house_start_date: string;
  constituency_country: string | null;
  email: string | null;
  age: number | null;
  department: string | null;
  ministerial_ranking: number | null;
  media: {
    twitter?: string;
    facebook?: string;
  } | null;
};

export type MPKeyPoint = {
  debate_id: string;
  ext_id: string;
  debate_title: string;
  debate_date: string;
  point: string;
  point_type: 'made' | 'supported' | 'opposed';
  original_speaker: string | null;
  ai_topics: AiTopics;
};

export type KeyPoint = {
  point: string;
  context: string | null;
  speaker: Speaker;
  support: Speaker[];
  opposition: Speaker[];
};

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
  debates?: {
    id: string;
    ext_id: string;
    title: string;
    date: string;
    subtopics?: string[];
  }[];
}

export type AiTopics = AiTopic[];

export interface DebateVote {
  debate_id: string;
  vote: boolean;
}

export interface EngagementCount {
  engagement_count: number | null;
}

export interface Division {
  external_id: string;
  debate_section_ext_id: string;
  date: string;
  time: string | null;
  has_time: boolean | null;
  ayes_count: number | null;
  noes_count: number | null;
  house: string | null;
  debate_section: string | null;
  debate_section_source: string | null;
  division_number: string;
  text_before_vote: string | null;
  text_after_vote: string | null;
  evel_type: number | null;
  evel_info: string | null;
  evel_ayes_count: number | null;
  evel_noes_count: number | null;
  is_committee_division: boolean | null;
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
  ai_question: string | null;
  ai_topic: string | null;
  ai_context: string | null;
  ai_key_arguments: {
    for: string;
    against: string;
  } | null;
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
  upvotes_speakers: Speaker[];
  downvotes_speakers: Speaker[];
}

export interface CommentThread {
  id: string;
  tags: string[];
  votes: CommentVotes;
  author: Speaker;
  content: string;
  parent_id: string | null;
}

// First, let's separate the filter types
type ArrayFilterId = 'type' | 'days' | 'topics';
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



interface AnalysisDataPoint {
  value: string;
  context: string;
}

interface KeyDate {
  date: string;
  significance: string;
}

interface KeyStatistic {
  value: string;
  context: string;
}

export interface ParsedAnalysisData {
  main_content?: string;
  outcome?: string;
  policy_terms?: string[];
  dates?: string[] | KeyDate[];
  data?: AnalysisDataPoint[];
  key_statistics?: KeyStatistic[];
}

export interface SpeakerPoint {
  name: string;
  role: string;
  party: string;
  constituency: string;
  contributions: string[];
}

export interface DebateWithSpeakerPoints {
  debate_id: string;
  debate_title: string;
  debate_date: string;
  speaker_points: SpeakerPoint[];
}

export type RawMPData = {
  member_id: number
  display_as: string
  full_title: string
  gender: string
  party: string
  constituency: string
  house_start_date: string
  constituency_country: string
  email: string | null
  age: number | null
  department: string | null
  ministerial_ranking: number | null
  media: string | Record<string, unknown> | null
}