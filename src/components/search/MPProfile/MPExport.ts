import { format } from 'date-fns';
import type { SavedSearch, MPDebate } from '@/types/search';
import type { MPData } from "@/types";
import { exportToPDF } from '@/lib/pdf-export';
import { useToast } from '@/hooks/use-toast';

// Shared utilities
interface ParsedMPDebate {
  content: string;
  references: Array<{ text: string; source: string }>;
}

export function parseContribution(contribution: string): ParsedMPDebate {
  try {
    return JSON.parse(contribution);
  } catch {
    return { content: contribution, references: [] };
  }
}

// Shared content formatting for consistency
export function formatMPContent(mp: MPData, debates?: MPDebate[]) {
  const content = `# ${mp.display_as}
${mp.party} MP for ${mp.constituency}${mp.constituency_country ? ` (${mp.constituency_country})` : ''}

## Current Role
- **Position:** ${mp.department || 'Backbench MP'}
${mp.ministerial_ranking ? `- **Ministerial Ranking:** ${mp.ministerial_ranking}` : ''}
${mp.full_title ? `- **Title:** ${mp.full_title}` : ''}

## Parliamentary Service
- **Member since:** ${format(new Date(mp.house_start_date), 'dd MMMM yyyy')}
${mp.age ? `- **Age:** ${mp.age}` : ''}

## Recent Contributions
${debates?.map((debate, index) => `
### ${index + 1}. ${debate.debate_title}
- **Date:** ${format(new Date(debate.debate_date), 'dd MMMM yyyy')}
- **Type:** ${debate.debate_type}
- **House:** ${debate.debate_house}

${debate.member_contributions.map(contribution => {
  const parsed = parseContribution(contribution);
  let text = `- ${parsed.content}`;
  if (parsed.references?.length) {
    text += '\n' + parsed.references.map(ref => 
      `  • **${ref.text}**: ${ref.source}`
    ).join('\n');
  }
  return text;
}).join('\n\n')}

[${index + 1}] https://whatgov.co.uk/debate/${debate.debate_id}
`).join('\n') || 'No recent contributions found.'}`;

  return content;
}

// Export handler for MPActions component
export async function handleMPExport(
  mp: MPData, 
  debates: MPDebate[] | undefined,
  toast: ReturnType<typeof useToast>['toast'],
  setIsExporting: (value: boolean) => void
) {
  try {
    setIsExporting(true);
    
    await exportToPDF({
      title: `Parliamentary Record: ${mp.display_as}`,
      content: formatMPContent(mp, debates),
      date: new Date(),
      citations: debates?.map(d => d.debate_id) || [],
      searchType: 'mp',
      markdown: true,
      latestContribution: debates?.[0] ? {
        memberName: debates[0].member_name,
        house: debates[0].debate_house,
        debateSection: debates[0].debate_title,
        contributionText: parseContribution(debates[0].member_contributions[0]).content,
        sittingDate: debates[0].debate_date,
        debateExtId: debates[0].debate_id
      } : undefined
    });

    toast({
      title: "Export complete",
      description: "MP record has been downloaded as PDF",
      duration: 3000
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    toast({
      title: "Export failed",
      description: "Please try again later",
      variant: "destructive",
      duration: 3000
    });
  } finally {
    setIsExporting(false);
  }
}

// Export handler for MPSearchCard component
export async function handleSavedMPExport(
  search: SavedSearch,
  toast: ReturnType<typeof useToast>['toast'],
  setIsExporting: (value: boolean) => void
) {
  try {
    setIsExporting(true);
    const responseData = JSON.parse(search.response);
    const debates = responseData.Debates;
    
    // If we have valid debate data
    if (debates?.[0]) {
      const mp: MPData = {
        member_id: parseInt(search.query_state?.mp || ''),
        display_as: debates[0].member_name,
        party: debates[0].member_party,
        constituency: debates[0].member_constituency || 'Unknown constituency',
        house_start_date: new Date().toISOString(), // Fallback as we don't have this in saved data
        department: debates[0].member_role,
        full_title: debates[0].member_role,
        gender: debates[0].member_gender,
        age: debates[0].member_age,
        ministerial_ranking: debates[0].member_ministerial_ranking,
        constituency_country: debates[0].member_constituency_country,
        email: debates[0].member_email,
        media: debates[0].member_media,
      };

      await exportToPDF({
        title: `Parliamentary Record: ${mp.display_as}`,
        content: formatMPContent(mp, debates),
        date: new Date(search.created_at),
        citations: debates.map((d: MPDebate) => d.debate_id),
        searchType: 'mp',
        markdown: true,
        latestContribution: {
          memberName: debates[0].member_name,
          house: debates[0].debate_house,
          debateSection: debates[0].debate_title,
          contributionText: parseContribution(debates[0].member_contributions[0]).content,
          sittingDate: debates[0].debate_date,
          debateExtId: debates[0].debate_id
        }
      });

      toast({
        title: "Export complete",
        description: "MP record has been downloaded as PDF",
        duration: 3000
      });
    } else {
      throw new Error('No debate data found');
    }
  } catch (error) {
    console.error('Error exporting MP data:', error);
    toast({
      title: "Export failed",
      description: "There was an error exporting the data",
      variant: "destructive",
      duration: 3000
    });
  } finally {
    setIsExporting(false);
  }
}