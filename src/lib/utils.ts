import { clsx, type ClassValue } from "clsx"
import { Leaf, Heart, Building2, Microscope, Scale, Globe2, LandPlot, GraduationCap, type LucideIcon } from "lucide-react";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// UK Postcode regex
export const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

export function formatPostcode(input: string): string {
  // Remove all spaces and convert to uppercase
  return input.replace(/\s+/g, '').toUpperCase();
}

export function insertPostcodeSpace(postcode: string): string {
  const clean = postcode.replace(/\s+/g, '');
  if (clean.length > 3) {
    return `${clean.slice(0, -3)} ${clean.slice(-3)}`;
  }
  return clean;
}

export const TOPICS: {
  id: string;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    id: "environment",
    label: "Environment and Natural Resources",
    icon: Leaf
  },
  {
    id: "healthcare",
    label: "Healthcare and Social Welfare",
    icon: Heart
  },
  {
    id: "economy",
    label: "Economy, Business, and Infrastructure",
    icon: Building2
  },
  {
    id: "science",
    label: "Science, Technology, and Innovation",
    icon: Microscope
  },
  {
    id: "legal",
    label: "Legal Affairs and Public Safety",
    icon: Scale
  },
  {
    id: "international",
    label: "International Relations and Diplomacy",
    icon: Globe2
  },
  {
    id: "parliamentary",
    label: "Parliamentary Affairs and Governance",
    icon: LandPlot
  },
  {
    id: "education",
    label: "Education, Culture, and Society",
    icon: GraduationCap
  }
];

export const FREE_LIMITS = {
  DAILY_VOTES: 12,
  DEBATE_SUMMARIES: 3,
  POLL_RESPONSES: 3
}

export const ENGAGEMENT_TRIGGERS = {
  VOTES_REMAINING: 8,    // Show signup prompt when 8 votes remain
  SUMMARIES_VIEWED: 2    // Show signup prompt after viewing 2 summaries
}

export type PartyColoursType = {
  [key: string]: { color: string };
};

export const partyColours: PartyColoursType = {
  'Conservative': { color: '#0087DC' }, //blue
  'Labour': { color: '#DC241f' }, //red
  'Liberal Democrat': { color: '#FDBB30' }, //yellow
  'Liberal': { color: '#FDBB30' }, //yellow
  'Scottish National Party': { color: '#FFF95D' }, //yellow
  'Green Party': { color: '#6AB023' }, //green
  'Green': { color: '#6AB023' }, //green
  'Plaid Cymru': { color: '#008142' }, //green
  'DUP': { color: '#19283F' }, //dark blue
  'Traditional Unionist Voice': { color: '#0C3A6A' }, //dark blue
  'Reform UK': { color: '#00bed6' }, //blue
  'Sinn Féin': { color: '#326760' }, //green
  'Independent': { color: '#808080' }, //grey
  'Independent/Labour': { color: '#DC241f' }, //red
  'Independent/Liberal Democrat': { color: '#FDBB30' }, //yellow
  'Labour (Co-op)': { color: '#DC241f' }, //lighter red
  'Ulster Unionist Party': { color: '#0087DC' }, //blue
  'Democratic Unionist Party': { color: '#19283F' }, //darker blue
}

export const locationColors: Record<string, string> = {
  // House of Commons - using the official Parliamentary green
  'Commons Chamber': '#006E46',        // official Commons green
  
  // Committee rooms - warm professional tones
  'General Committees': '#855438',     // refined brown
  
  // House of Lords - official red tones
  'Grand Committee': '#A3243B',        // official Lords red
  'Lords Chamber': '#9C1A39',          // deep Lords crimson
  
  // Written content - professional blues
  'Written Statements': '#234E66',     // steel blue
  'Written Corrections': '#193C5D',    // navy blue
  
  // Secondary locations
  'Westminster Hall': '#4B4B4D',       // stone grey
  'Public Bill Committees': '#2D6E45', // forest green
  'Petitions': '#505A5F',             // neutral grey
};

export const HOUSE_COLORS = {
  Commons: "rgb(0, 110, 70)", // Commons green
  Lords: "rgb(163, 36, 59)",  // Lords red
} as const;

export type DebateType = {
  type: string;
  label: string;
  house: 'Commons' | 'Lords';
};

export const DEBATE_TYPES = {
  Commons: [
    // Chamber debates
    { type: "Main", label: "Main Chamber Business", house: "Commons" },
    { type: "Question", label: "Questions", house: "Commons" },
    { type: "Urgent Question", label: "Urgent Questions", house: "Commons" },
    { type: "Prime Minister's Questions", label: "Prime Minister's Questions", house: "Commons" },
    { type: "Statement", label: "Ministerial Statements", house: "Commons" },
    { type: "Opposition Day", label: "Opposition Day Debates", house: "Commons" },
    { type: "Debated Motion", label: "Motions", house: "Commons" },
    { type: "Debated Bill", label: "Bill Debates", house: "Commons" },
    { type: "Bill Procedure", label: "Bill Procedures", house: "Commons" },
    { type: "Business Without Debate", label: "Business Without Debate", house: "Commons" },
    { type: "Delegated Legislation", label: "Delegated Legislation", house: "Commons" },
    { type: "Petition", label: "Petitions", house: "Commons" },
    { type: "Department", label: "Departmental Business", house: "Commons" },
    { type: "Generic", label: "Other Business", house: "Commons" },

    // Other locations
    { type: "Westminster Hall", label: "Westminster Hall Debates", house: "Commons" },
    { type: "Public Bill Committees", label: "Public Bill Committees", house: "Commons" },
    { type: "General Committees", label: "General Committees", house: "Commons" },
    
    // Written business
    { type: "Written Statements", label: "Written Statements", house: "Commons" },
    { type: "Written Corrections", label: "Written Corrections", house: "Commons" },
  ],
  Lords: [
    { type: "Lords Chamber", label: "Lords Chamber Business", house: "Lords" },
    { type: "Grand Committee", label: "Grand Committee", house: "Lords" },
  ]
} as const;

export function getDebateType(type: string): DebateType {
  // Check Commons types
  const commonsType = DEBATE_TYPES.Commons.find(t => t.type === type);
  if (commonsType) return commonsType;

  // Check Lords types
  const lordsType = DEBATE_TYPES.Lords.find(t => t.type === type);
  if (lordsType) return lordsType;

  // If no match found, return Other type
  return {
    type: "Other",
    label: "General Debate",
    house: "Commons"
  };
}

export const VALID_TYPES = [
  ...DEBATE_TYPES.Commons,
  ...DEBATE_TYPES.Lords
];

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
]