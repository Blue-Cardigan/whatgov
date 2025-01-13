'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import type { SavedSearch, SavedSearchSchedule } from '@/types/search';
import type{ TimeSlot } from '@/types/calendar';
import { SearchCard } from './SearchCard';
import { Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CalendarCard } from './CalendarCard';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, BellRing } from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { COLORS, exportToPDF } from '@/lib/pdf-export';
import { format } from 'date-fns';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

// Initialize pdfMake fonts
if (pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else {
  pdfMake.vfs = pdfFonts;
}

interface SavedCalendarItem {
  id: string;
  user_id: string;
  event_id: string;
  event_data: TimeSlot;
  date: string;
  created_at: string;
  debate_ids?: string[];
}

interface DebateData {
  analysis: string;
  speaker_points: any[]; // or more specific type if available
  title: string;
  date: string;
  house: string;
  type: string;
}

const formatAnalysisData = (analysis: string) => {
  try {
    const data = JSON.parse(analysis);
    return `
## Main Points
${data.main_points}

## Outcome
${data.outcome}

## Key Statistics
${data.key_statistics?.map((stat: any) => `- ${stat.value}: ${stat.context}`).join('\n')}

## Key Dates
${data.key_dates?.map((date: any) => `- ${date.date}: ${date.significance}`).join('\n')}
`.trim();
  } catch (e) {
    console.warn('Failed to parse analysis JSON:', e);
    return analysis;
  }
};

const formatSpeakerPoints = (speakerPoints: string | any[]) => {
  try {
    const points = Array.isArray(speakerPoints) 
      ? speakerPoints 
      : JSON.parse(speakerPoints || '[]');
    
    return points.map((speaker: any) => `
## ${speaker.name}
${speaker.role}${speaker.constituency ? ` - ${speaker.constituency}` : ''}
Party: ${speaker.party}

Key Contributions:
${speaker.key_contributions?.map((contribution: any) => `
- ${contribution.content}
  ${contribution.references?.map((ref: any) => `  • ${ref.text}`).join('\n') || ''}
`).join('\n')}
`.trim()).join('\n\n');
  } catch (e) {
    console.warn('Failed to parse speaker points:', e);
    return '';
  }
};

export function SavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [calendarItems, setCalendarItems] = useState<SavedCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<'all' | 'ai' | 'hansard'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'activity'>('date');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      try {
        const [searchesResponse, calendarResponse] = await Promise.all([
          supabase
            .from('saved_searches')
            .select(`
              *,
              saved_search_schedules (
                id,
                is_active,
                repeat_on,
                next_run_at
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('saved_calendar_items')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        if (searchesResponse.error) throw searchesResponse.error;
        if (calendarResponse.error) throw calendarResponse.error;

        setSearches(searchesResponse.data || []);
        setCalendarItems(calendarResponse.data || []);
      } catch (error) {
        console.error('Error fetching saved items:', error);
        toast({
          title: "Error loading saved items",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id, supabase, toast]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('saved_searches_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_searches',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSearches(current => 
              current.map(search => 
                search.id === payload.new.id ? { ...search, ...payload.new } : search
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setSearches(current => [payload.new as SavedSearch, ...current]);
          } else if (payload.eventType === 'DELETE') {
            setSearches(current => 
              current.filter(search => search.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase]);

  useEffect(() => {
    return () => {
      if (!user?.id || searches.length === 0) return;

      const unreadSearchIds = searches
        .filter(search => search.is_unread)
        .map(search => search.id);

      if (unreadSearchIds.length === 0) return;

      supabase
        .from('saved_searches')
        .update({ is_unread: false, has_changed: false })
        .in('id', unreadSearchIds)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to mark searches as read:', error);
          }
        });
    };
  }, [user, searches, supabase]);

  const handleDeleteSearch = async (searchId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .match({ 
          id: searchId,
          user_id: user.id
        });

      if (error) throw error;

      setSearches(prevSearches => 
        prevSearches.filter(search => search.id !== searchId)
      );

      toast({
        title: "Search deleted",
        description: "Your saved search has been removed",
      });
    } catch (error) {
      console.error('Failed to delete search:', error);
      toast({
        title: "Delete failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCalendarItem = async (itemId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('saved_calendar_items')
        .delete()
        .match({ 
          id: itemId,
          user_id: user.id
        });

      if (error) throw error;

      setCalendarItems(prevItems => 
        prevItems.filter(item => item.id !== itemId)
      );

      toast({
        title: "Event deleted",
        description: "Event removed from your saved items",
      });
    } catch (error) {
      console.error('Failed to delete calendar item:', error);
      toast({
        title: "Delete failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  // Group searches by query
  const groupedSearches = useMemo(() => {
    const groups = searches.reduce((acc, search) => {
      const key = `${search.query}-${search.search_type}`;
      if (!acc[key]) {
        acc[key] = {
          mainSearch: search,
          relatedSearches: []
        };
      } else {
        acc[key].relatedSearches.push(search);
      }
      return acc;
    }, {} as Record<string, { mainSearch: SavedSearch, relatedSearches: SavedSearch[] }>);

    return Object.values(groups);
  }, [searches]);

  // Filter and sort searches
  const filteredSearches = useMemo(() => {
    let filtered = groupedSearches;
    // Apply sorting
    return filtered.sort((a, b) => {
      // Default date sorting
      return new Date(b.mainSearch.created_at).getTime() - 
             new Date(a.mainSearch.created_at).getTime();
    });
  }, [groupedSearches, filterType, sortBy]);

  const handleCalendarExport = async (item: SavedCalendarItem) => {
    try {
      // Fetch associated debate data if debate_ids exist
      let debateData: Record<string, DebateData> = {};
      
      if (item.debate_ids?.length) {
        const { data: debates, error } = await supabase
          .from('debates_new')
          .select('ext_id, analysis, speaker_points, title, date, house, type')
          .in('ext_id', item.debate_ids);

        if (error) throw error;

        // Create a map of debate data by ext_id
        debateData = debates?.reduce((acc, debate) => ({
          ...acc,
          [debate.ext_id]: debate
        }), {}) || {};
      }

      // Format the event data based on type
      let title = 'Calendar Event';
      let content = '';
      let analysisContent = '';

      const formatDebateAnalysis = (debate: DebateData | undefined) => {
        if (!debate) return '';
        
        const analysisText = debate.analysis ? formatAnalysisData(debate.analysis) : 'No analysis available';
        const speakerPointsText = formatSpeakerPoints(debate.speaker_points);
        
        return `
# ${debate.title}
Date: ${format(new Date(debate.date), 'PPP')}
House: ${debate.house}
Type: ${debate.type}

${analysisText}

${speakerPointsText ? `# Speaker Contributions\n${speakerPointsText}` : ''}
        `.trim();
      };

      if (item.event_data.type === 'edm' && item.event_data.edm) {
        const { edm } = item.event_data;
        title = `EDM ${edm.id}: ${edm.title}`;
        content = `
Primary Sponsor: ${edm.primarySponsor?.name || 'N/A'}
Date Tabled: ${format(new Date(edm.dateTabled), 'PPP')}
Text: ${edm.text}
        `.trim();
      } else if (item.event_data.type === 'oral-questions') {
        title = `Oral Questions: ${item.event_data.department}`;
        content = `
Date: ${format(new Date(item.date), 'PPP')}
Department: ${item.event_data.department}
Minister: ${item.event_data.ministerTitle || 'N/A'}
        `.trim();

        // Add debate analysis if available
        if (item.debate_ids?.[0]) {
          const debate = debateData[item.debate_ids[0]];
          if (debate) {
            analysisContent = formatDebateAnalysis(debate);
          }
        }
      } else if (item.event_data.type === 'event' && item.event_data.event) {
        const { event } = item.event_data;
        title = event.title;
        content = `
Type: ${event.type || 'N/A'}
Date: ${event.startTime ? format(new Date(event.startTime), 'PPP p') : 'N/A'}
Location: ${event.location || 'N/A'}
Description: ${event.description || 'N/A'}
        `.trim();

        // Add debate analysis for each linked debate
        if (item.debate_ids?.length) {
          analysisContent = item.debate_ids
            .map(debateId => {
              const debate = debateData[debateId];
              return debate ? formatDebateAnalysis(debate) : '';
            })
            .filter(Boolean)
            .join('\n\n---\n\n');
        }
      }

      // Combine content with analysis if available
      const finalContent = analysisContent 
        ? `${content}\n\n${analysisContent}`
        : content;

      await exportToPDF({
        title,
        content: finalContent,
        date: new Date(item.created_at),
        searchType: 'calendar',
        markdown: true
      });

      toast({
        title: "Export complete",
        description: "Calendar event has been exported to PDF",
      });
    } catch (error) {
      console.error('Error exporting calendar event:', error);
      toast({
        title: "Export failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleBulkExport = async () => {
    try {
      setIsExporting(true);

      // Create an array to hold all content sections
      const allContent: Content[] = [];
      
      // Export searches first
      for (const group of groupedSearches) {
        const { mainSearch } = group;
        
        // Add a page break before each item (except the first)
        if (allContent.length > 0) {
          allContent.push({ text: '', pageBreak: 'before' });
        }

        // Format content and get latest contribution for Hansard searches
        let content = mainSearch.response;
        let latestContribution;

        if (mainSearch.search_type === 'hansard') {
          try {
            const response = JSON.parse(mainSearch.response);
            content = response.summary 
              ? `Total Contributions: ${response.summary.TotalContributions}
                 Total Debates: ${response.summary.TotalDebates}
                 Total Written Statements: ${response.summary.TotalWrittenStatements}`
              : mainSearch.response;

            if (response.firstResult) {
              latestContribution = {
                memberName: response.firstResult.MemberName,
                house: response.firstResult.House,
                debateSection: response.firstResult.DebateSection,
                contributionText: response.firstResult.ContributionText,
                sittingDate: response.firstResult.SittingDate,
                debateExtId: response.firstResult.DebateSectionExtId
              };
            }
          } catch (e) {
            console.warn('Failed to parse Hansard response:', e);
          }
        }

        // Process citations
        let processedCitations = [];
        try {
          if (mainSearch.citations) {
            processedCitations = typeof mainSearch.citations === 'string' 
              ? JSON.parse(mainSearch.citations)
              : mainSearch.citations;
          }
        } catch (e) {
          console.warn('Failed to parse citations:', e);
        }

        // Get content for this item
        const itemContent = await exportToPDF({
          title: mainSearch.query,
          content,
          citations: processedCitations,
          date: new Date(mainSearch.created_at),
          searchType: mainSearch.search_type as 'ai' | 'hansard',
          latestContribution,
          markdown: mainSearch.search_type === 'ai',
          returnContent: true
        });

        // Ensure itemContent is an array before spreading
        if (Array.isArray(itemContent)) {
          allContent.push(...itemContent);
        } else if (itemContent) {
          allContent.push(itemContent);
        }
      }

      // Then export calendar items
      for (const item of calendarItems) {
        // Add page break
        if (allContent.length > 0) {
          allContent.push({ text: '', pageBreak: 'before' });
        }

        let title = 'Calendar Event';
        let content = '';

        if (item.event_data.type === 'edm' && item.event_data.edm) {
          const { edm } = item.event_data;
          title = `EDM ${edm.id}: ${edm.title}`;
          content = `
Primary Sponsor: ${edm.primarySponsor?.name || 'N/A'}
Date Tabled: ${format(new Date(edm.dateTabled), 'PPP')}
Text: ${edm.text}
          `.trim();
        }

        const itemContent = await exportToPDF({
          title,
          content,
          date: new Date(item.created_at),
          searchType: 'calendar',
          returnContent: true
        });

        // Ensure itemContent is an array before spreading
        if (Array.isArray(itemContent)) {
          allContent.push(...itemContent);
        } else if (itemContent) {
          allContent.push(itemContent);
        }
      }

      // Create and download the combined PDF
      const docDefinition: TDocumentDefinitions = {
        pageMargins: [40, 80, 40, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 60,
                  color: COLORS.primary,
                }
              ]
            },
            {
              columns: [
                {
                  width: 40,
                  text: 'W',
                  font: 'Roboto',
                  fontSize: 24,
                  bold: true,
                  color: COLORS.primaryForeground,
                  margin: [40, -40, 0, 0]
                },
                {
                  width: '*',
                  text: 'WhatGov Export',
                  alignment: 'right',
                  color: COLORS.primaryForeground,
                  style: 'metadata',
                  margin: [0, -32, 40, 0]
                }
              ]
            }
          ]
        },
        footer: (currentPage, pageCount) => ({
          columns: [
            {
              text: `Generated on ${format(new Date(), 'PPP')}`,
              alignment: 'left',
              margin: [40, 20, 0, 0],
              style: 'metadata'
            },
            {
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: 'right',
              margin: [0, 20, 40, 0],
              style: 'metadata'
            }
          ]
        }),
        content: allContent,
        defaultStyle: {
          font: 'Roboto'
        },
        styles: {
          // ... copy all styles from exportToPDF ...
        }
      };

      const filename = `saved_items_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdfMake.createPdf(docDefinition).download(filename);

      toast({
        title: "Export complete",
        description: "All items have been exported to PDF",
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "Export failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Saved Items</h1>
          <p className="text-muted-foreground">Please sign in to view your saved items.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground mt-4">Loading your saved items...</p>
        </div>
      </div>
    );
  }

  if (searches.length === 0 && calendarItems.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">No saved items</h1>
          <p className="text-muted-foreground">
            Your saved searches and calendar items will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Saved Items</h1>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filterType}
            onValueChange={(value: 'all' | 'ai' | 'hansard') => setFilterType(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Searches</SelectItem>
              <SelectItem value="ai">AI Research</SelectItem>
              <SelectItem value="hansard">Hansard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Searches</div>
              <div className="text-2xl font-bold">{searches.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Active Schedules</div>
              <div className="text-2xl font-bold">
                {searches.filter(s => s.saved_search_schedules?.[0]?.is_active).length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Unread Updates</div>
              <div className="text-2xl font-bold text-primary">
                {searches.filter(s => s.is_unread).length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Changed Results</div>
              <div className="text-2xl font-bold text-warning">
                {searches.filter(s => s.has_changed).length}
              </div>
            </Card>
          </div>

          {/* Search Results */}
          <div className="space-y-4">
            {(() => {
              // First, filter based on selected type
              const filteredByType = filterType === 'all' 
                ? filteredSearches 
                : filteredSearches.filter(group => group.mainSearch.search_type === filterType);

              // Then pair up Hansard searches
              const hansardPairs = filteredByType
                .filter(group => group.mainSearch.search_type === 'hansard')
                .reduce<Array<typeof filteredSearches>>((pairs, group, index, array) => {
                  if (index % 2 === 0) {
                    pairs.push([
                      group,
                      array[index + 1] // Might be undefined for odd number of items
                    ].filter(Boolean));
                  }
                  return pairs;
                }, []);

              // Get AI searches
              const aiSearches = filteredByType
                .filter(group => group.mainSearch.search_type === 'ai');

              // Combine and sort all items (pairs count as one item)
              const mixedResults = [
                ...hansardPairs.map(pair => ({
                  type: 'hansard-pair' as const,
                  date: new Date(pair[0].mainSearch.created_at),
                  content: pair
                })),
                ...aiSearches.map(group => ({
                  type: 'ai' as const,
                  date: new Date(group.mainSearch.created_at),
                  content: group
                }))
              ].sort((a, b) => b.date.getTime() - a.date.getTime());

              // If no results after filtering, show message
              if (mixedResults.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    No {filterType === 'all' ? '' : filterType} searches found
                  </div>
                );
              }

              // Render the mixed results
              return mixedResults.map((item, index) => {
                if (item.type === 'hansard-pair') {
                  return (
                    <div key={`pair-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {item.content.map(group => (
                        <SearchCard 
                          key={group.mainSearch.id}
                          search={group.mainSearch as SavedSearch & { saved_search_schedules?: SavedSearchSchedule[] }}
                          relatedSearches={group.relatedSearches}
                          onDelete={() => handleDeleteSearch(group.mainSearch.id)}
                          user={user}
                          compact={true}
                        />
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <SearchCard 
                      key={item.content.mainSearch.id}
                      search={item.content.mainSearch as SavedSearch & { saved_search_schedules?: SavedSearchSchedule[] }}
                      relatedSearches={item.content.relatedSearches}
                      onDelete={() => handleDeleteSearch(item.content.mainSearch.id)}
                      user={user}
                      compact={false}
                    />
                  );
                }
              });
            })()}
          </div>
        </div>

        {/* Right Column: Calendar and Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleBulkExport}
                disabled={isExporting || searches.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export All Results'}
              </Button>
              <Button className="w-full" variant="outline">
                <BellRing className="w-4 h-4 mr-2" />
                Manage All Schedules
              </Button>
            </CardContent>
          </Card>

          {/* Calendar Items */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Saved Calendar Items</h2>
            <div className="space-y-4">
              {calendarItems.map((item) => (
                <CalendarCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDeleteCalendarItem(item.id)}
                  onDownload={() => handleCalendarExport(item)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}