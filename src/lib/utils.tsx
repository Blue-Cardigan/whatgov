import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Contribution } from "@/types/search";
import ReactMarkdown from "react-markdown";
import { Children, ReactNode } from 'react';
import { Citation } from '@/types/search';
import { InlineCitation } from '@/components/ui/inline-citation';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to get last 7 weekdays
export function getLastSevenDays(): string[] {
  const days: string[] = [];
  const today = new Date();
  const currentDate = new Date(today);
  let daysCollected = 0;

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  while (daysCollected < 7) {
    const dayOfWeek = currentDate.getDay();
    // Only include weekdays (Monday-Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const weekday = weekdays[dayOfWeek - 1];
      const dateStr = currentDate.toISOString().split('T')[0];
      days.push(`${weekday} ${dateStr}`);
      daysCollected++;
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return days;
} 

export const getThreeFourPortraitUrl = (memberId: number) => 
  `https://members-api.parliament.uk/api/Members/${memberId}/Portrait?croptype=threefour&webversion=true`;

export const getOneOnePortraitUrl = (memberId: number) => 
  `https://members-api.parliament.uk/api/Members/${memberId}/Portrait?croptype=oneone&webversion=true`;


// Add this new component for consistent markdown styling
interface FormattedMarkdownProps {
  content: string;
  citations?: Citation[];
}

export function FormattedMarkdown({ content, citations }: FormattedMarkdownProps) {
  const renderWithCitations = (text: string) => {
    if (!citations) return text;

    const parts = text.split(/(【\d+】)/g);
    return parts.map((part, i) => {
      const citationMatch = part.match(/【(\d+)】/);
      if (citationMatch) {
        const citationNumber = parseInt(citationMatch[1], 10);
        const citation = citations.find(c => c.citation_index === citationNumber);
        if (citation) {
          return (
            <InlineCitation
              key={`citation-${citationNumber}-${i}`}
              citation={citation}
            />
          );
        }
        return <span key={`unmatched-citation-${i}`}>【{citationNumber}】</span>;
      }
      return part ? <span key={`text-${i}`}>{part}</span> : null;
    }).filter(Boolean);
  };

  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary hover:text-primary-foreground hover:bg-primary transition-colors no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        p: ({ children }) => (
          <p className="leading-relaxed text-justify mb-4">
            {typeof children === 'string' 
              ? renderWithCitations(children)
              : children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-6 mb-4">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 mb-4">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="mb-1">
            {Children.map(children, (child: ReactNode) =>
              typeof child === 'string' ? renderWithCitations(child) : child
            )}
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-muted pl-4 italic my-4">
            {typeof children === 'string'
              ? renderWithCitations(children)
              : children}
          </blockquote>
        ),
        strong: ({ children }) => (
          <strong className="font-bold">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic">
            {children}
          </em>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
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