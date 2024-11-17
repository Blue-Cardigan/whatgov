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
}