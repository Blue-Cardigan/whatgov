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
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, BellRing } from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { exportToPDF } from '@/lib/pdf-export';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SavedCalendarItem {
  id: string;
  user_id: string;
  event_id: string;
  event_data: TimeSlot;
  created_at: string;
}

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

  const handleBulkExport = async () => {
    try {
      setIsExporting(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let isFirstPage = true;

      for (const group of groupedSearches) {
        const { mainSearch } = group;
        
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

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

            // Extract latest contribution details
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

        await exportToPDF({
          title: mainSearch.query,
          content,
          citations: processedCitations,
          date: new Date(mainSearch.created_at),
          doc,
          searchType: mainSearch.search_type as 'ai' | 'hansard',
          latestContribution
        });
      }

      // Save the combined PDF
      const filename = `saved_searches_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);

      toast({
        title: "Export complete",
        description: "All searches have been exported to PDF",
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
              // First, pair up Hansard searches
              const hansardPairs = filteredSearches
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
              const aiSearches = filteredSearches
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
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}