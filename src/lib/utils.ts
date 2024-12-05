import { KeyPoint } from "@/types";
import { Json } from "@/types/supabase";
import { clsx, type ClassValue } from "clsx"
import { Leaf, Heart, Building2, Microscope, Scale, Globe2, LandPlot, GraduationCap, type LucideIcon } from "lucide-react";
import { twMerge } from "tailwind-merge"
import { Contribution } from "@/types/search";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to safely parse JSON fields
export function parseKeyPoints(json: Json): KeyPoint[] {
  if (!json) return [];
  
  let parsedJson = json;
  if (typeof json === 'string') {
    try {
      parsedJson = JSON.parse(json);
    } catch (e) {
      console.error('Error parsing key points JSON string:', e);
      return [];
    }
  }
  
  if (!Array.isArray(parsedJson)) {
    console.error('Key points data is not an array:', parsedJson);
    return [];
  }
  
  return parsedJson
    .map(item => {
      if (!item || typeof item !== 'object') {
        console.error('Invalid key point item:', item);
        return null;
      }

      const keyPoint = item as Record<string, unknown>;
      
      // Ensure support and opposition are always arrays
      const support = Array.isArray(keyPoint.support) ? keyPoint.support : [];
      const opposition = Array.isArray(keyPoint.opposition) ? keyPoint.opposition : [];

      // Handle both old and new speaker formats
      let speaker;
      if (typeof keyPoint.speaker === 'string') {
        // Parse old format (string with party in parentheses)
        const name = keyPoint.speaker.replace(/\s*\([^)]*\)\s*$/, '');
        const party = (keyPoint.speaker.match(/\(([^)]+)\)$/) || [])[1] || null;
        speaker = {
          name,
          party,
          memberId: null,
          constituency: null
        };
      } else if (typeof keyPoint.speaker === 'object' && keyPoint.speaker) {
        // Use new format
        speaker = keyPoint.speaker as {
          name: string;
          party: string | null;
          memberId: string | null;
          constituency: string | null;
        };
      } else {
        console.error('Invalid speaker format:', keyPoint.speaker);
        return null;
      }

      if (typeof keyPoint.point !== 'string') {
        console.error('Invalid point format:', keyPoint);
        return null;
      }

      return {
        point: keyPoint.point,
        context: typeof keyPoint.context === 'string' ? keyPoint.context : null,
        speaker,
        support: support.filter((s): s is string => typeof s === 'string'),
        opposition: opposition.filter((o): o is string => typeof o === 'string')
      };
    })
    .filter((item): item is KeyPoint => item !== null);
}

export function constructHansardUrl(result: Contribution, searchTerm?: string) {
  // Format the date (yyyy-mm-dd)
  const formattedDate = result.SittingDate.split('T')[0];

  // Format the debate title for the URL (lowercase, hyphens)
  const formattedTitle = result.DebateSection
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  // Construct the base URL
  const baseUrl = `https://hansard.parliament.uk/${result.House}/${formattedDate}/debates/${result.DebateSectionExtId}/${formattedTitle}`;

  // Add search term highlight if provided
  const highlightParam = searchTerm ? `?highlight=${encodeURIComponent(searchTerm)}` : '';

  // Add contribution anchor
  const contributionAnchor = `#contribution-${result.ContributionExtId}`;

  return `${baseUrl}${highlightParam}${contributionAnchor}`;
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

export const ANON_LIMITS = {
  DAILY_VOTES: 12,
}

export const ENGAGEMENT_TRIGGERS = {
  VOTES_REMAINING: [1, 3, 6, ANON_LIMITS.DAILY_VOTES - 1]
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
    { type: "Question", label: "Question", house: "Commons" },
    { type: "Urgent Question", label: "Urgent Question", house: "Commons" },
    { type: "Prime Minister's Questions", label: "Prime Minister's Questions", house: "Commons" },
    { type: "Statement", label: "Ministerial Statement", house: "Commons" },
    { type: "Opposition Day", label: "Opposition Day Debate", house: "Commons" },
    { type: "Debated Motion", label: "Debated Motion", house: "Commons" },
    { type: "Debated Bill", label: "Bill Debate", house: "Commons" },
    { type: "Bill Procedure", label: "Bill Procedure", house: "Commons" },
    { type: "Business Without Debate", label: "Business Without Debate", house: "Commons" },
    { type: "Delegated Legislation", label: "Delegated Legislation", house: "Commons" },
    { type: "Petition", label: "Petition", house: "Commons" },
    { type: "Department", label: "Departmental Questions", house: "Commons" },
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

// Add house groupings for locations
export const LOCATION_GROUPS = {
  Commons: [
    'Commons Chamber',
    'Westminster Hall',
    'General Committees',
    'Public Bill Committees',
    'Petitions',
  ],
  Lords: [
    'Lords Chamber',
    'Grand Committee',
  ],
  Written: [
    'Written Statements',
    'Written Corrections',
  ],
} as const;