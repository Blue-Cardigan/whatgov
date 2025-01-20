'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { SavedSearch } from '@/types/search';
import type{ TimeSlot } from '@/types/calendar';
import { useToast } from '@/hooks/use-toast';
import { CalendarCard } from './CalendarCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users } from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { exportCalendarItemToPDF, exportSearchToPDF } from '@/lib/pdf-utilities';
import { exportAllToPDF } from '@/lib/pdf-bulk';
import { fetchSavedSearches, deleteSavedSearch, markSearchesAsRead, updateSearchSchedule } from '@/lib/supabase/saved-searches';
import { fetchSavedCalendarItems, deleteCalendarItem, markCalendarItemsAsRead } from '@/lib/supabase/saved-calendar-items';
import { AISearchCard } from './AISearchCard';
import HansardSearchCard from './HansardSearchCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Brain, Calendar } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { RSSFeed } from './RSSFeed';
import Link from 'next/link';
import { MPSearchCard } from './MPSearchCard';


interface SavedCalendarItem {
  id: string;
  user_id: string;
  event_id: string;
  event_data: TimeSlot;
  date: string;
  created_at: string;
  is_unread?: boolean;
  debate_ids?: string[];
}

type FilterType = 'all' | 'ai' | 'hansard' | 'calendar' | 'mp';

export function SavedSearches() {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [calendarItems, setCalendarItems] = useState<SavedCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isProfessional } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      try {
        const [searchesData, calendarData] = await Promise.all([
          fetchSavedSearches(user.id),
          fetchSavedCalendarItems(user.id)
        ]);

        setSearches(searchesData);
        setCalendarItems(calendarData);
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
  }, [user?.id, toast]);

  // Mark items as read when viewed
  useEffect(() => {
    if (!user?.id) return;

    const unreadSearchIds = searches
      .filter(search => search.is_unread)
      .map(search => search.id);

    const unreadCalendarIds = calendarItems
      .filter(item => item.is_unread)
      .map(item => item.id);

    if (unreadSearchIds.length > 0) {
      markSearchesAsRead(unreadSearchIds, user.id)
        .then(() => {
          setSearches(current =>
            current.map(search =>
              unreadSearchIds.includes(search.id)
                ? { ...search, is_unread: false }
                : search
            )
          );
        })
        .catch(error => {
          console.error('Failed to mark searches as read:', error);
        });
    }

    if (unreadCalendarIds.length > 0) {
      markCalendarItemsAsRead(unreadCalendarIds, user.id)
        .then(() => {
          setCalendarItems(current =>
            current.map(item =>
              unreadCalendarIds.includes(item.id)
                ? { ...item, is_unread: false }
                : item
            )
          );
        })
        .catch((error: Error) => {
          console.error('Failed to mark calendar items as read:', error);
        });
    }
  }, [user?.id, searches, calendarItems]);

  // Group and filter content
  const groupedSearches = useMemo(() => {
    if (filterType === 'calendar') return [];
    
    return searches
      .filter(search => 
        filterType === 'all' || search.search_type === filterType
      )
      .reduce((acc, search) => {
        const key = `${search.query}-${search.search_type}`;
        if (!acc[key]) {
          // Sort related searches by date when creating the group
          const relatedSearches = searches.filter(s => 
            s.id !== search.id && 
            s.query === search.query && 
            s.search_type === search.search_type
          ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          // Find the most recent search (including the current one)
          const allSearches = [search, ...relatedSearches];
          const mostRecent = allSearches.reduce((latest, current) => 
            new Date(current.created_at) > new Date(latest.created_at) ? current : latest
          );

          acc[key] = {
            mainSearch: mostRecent,
            relatedSearches: allSearches
              .filter(s => s.id !== mostRecent.id)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          };
        }
        return acc;
      }, {} as Record<string, { mainSearch: SavedSearch, relatedSearches: SavedSearch[] }>);
  }, [searches, filterType]);

  const filteredCalendarItems = useMemo(() => {
    if (filterType !== 'all' && filterType !== 'calendar') return [];
    return calendarItems;
  }, [calendarItems, filterType]);

  const stats = useMemo(() => ({
    ai: searches.filter(s => s.search_type === 'ai').length,
    hansard: searches.filter(s => s.search_type === 'hansard').length,
    calendar: calendarItems.length,
    mp: searches.filter(s => s.search_type === 'mp').length,
    unread: [
      ...searches.filter(s => s.is_unread),
      ...calendarItems.filter(i => i.is_unread)
    ].length
  }), [searches, calendarItems]);

  const renderContent = () => {
    const items: React.ReactNode[] = [];

    // Add searches
    Object.values(groupedSearches).forEach(group => {
      items.push(
        <div key={group.mainSearch.id}>
          {renderSearchCard(group.mainSearch, group.relatedSearches)}
        </div>
      );
    });

    // Add calendar items
    filteredCalendarItems.forEach(item => {
      items.push(
        <CalendarCard
          key={item.id}
          item={item}
          onDelete={() => deleteCalendarItem(item.id)}
          onDownload={() => handleCalendarExport(item)}
        />
      );
    });

    return items.length > 0 ? (
      <div className="space-y-4">{items}</div>
    ) : (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
          <Search className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No items found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {filterType === 'all' 
            ? "You haven't saved any items yet"
            : `No ${filterType} items found`}
        </p>
      </div>
    );
  };

  const handleCalendarExport = async (item: SavedCalendarItem) => {
    try {
      // If there are debate IDs, we might want to fetch debate data first
      let debateData;
      if (item.debate_ids?.[0]) {
        // Fetch debate data if needed
        // debateData = await fetchDebateData(item.debate_ids[0]);
      }
      await exportCalendarItemToPDF(item, debateData);
    } catch (error) {
      console.error('Error exporting calendar item:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your calendar item",
        variant: "destructive"
      });
    }
  };

  const handleBulkExport = async () => {
    try {
      setIsExporting(true);
      await exportAllToPDF(searches, calendarItems);
    } catch (error) {
      console.error('Error exporting all items:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your saved items",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderSearchCard = (search: SavedSearch, relatedSearches: SavedSearch[]) => {
    switch (search.search_type) {
      case 'ai':
        return (
          <AISearchCard
            key={search.id}
            search={search}
            relatedSearches={relatedSearches}
            onDelete={() => deleteSavedSearch(search.id, user!.id)}
            user={user}
          />
        );
      case 'hansard':
        return (
          <HansardSearchCard
            key={search.id}
            search={search}
            onDelete={() => deleteSavedSearch(search.id, user!.id)}
            onScheduleUpdate={async (enabled, day) => {
              await updateSearchSchedule(search.id, user!.id, {
                is_active: enabled,
                repeat_on: enabled ? {
                  frequency: 'weekly',
                  dayOfWeek: parseInt(day)
                } : null
              });
            }}
            onExport={async () => {
              await exportSearchToPDF(search);
            }}
            isProfessional={isProfessional}
          />
        );
      case 'mp':
        return (
          <MPSearchCard
            key={search.id}
            search={search}
            onDelete={() => deleteSavedSearch(search.id, user!.id)}
            user={user}
          />
        );
      default:
        return null;
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
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        {/* Upgrade Notice for Free Users */}
        {!isProfessional && (
          <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              You&apos;re using a free account. {' '}
              <Link 
                href="/account/upgrade" 
                className="font-medium text-primary hover:underline"
              >
                Upgrade to Professional
              </Link>
              {' '}to enable scheduled searches and notifications for your saved items.
            </p>
          </div>
        )}

         {/* Header Section */}
         <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Saved Items</h1>
            <p className="text-muted-foreground mt-1">
              Manage your saved searches and calendar items
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {stats.unread > 0 && (
              <Badge variant="secondary" className="h-8">
                {stats.unread} unread
              </Badge>
            )}
            {isProfessional && (
              <Button 
                variant="outline"
                onClick={handleBulkExport}
                disabled={isExporting || (searches.length === 0 && calendarItems.length === 0)}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export All'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Searches</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ai}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hansard Searches</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hansard}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calendar Items</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.calendar}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MP Searches</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mp}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs 
          value={filterType} 
          onValueChange={(value) => setFilterType(value as FilterType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="relative">
              All
              {stats.unread > 0 && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 h-5 min-w-5"
                >
                  {stats.unread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ai">AI Searches</TabsTrigger>
            <TabsTrigger value="hansard">Hansard</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="mp">MPs</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScrollArea className="md:col-span-2 h-full">
            {renderContent()}
          </ScrollArea>

          <div className="space-y-6 h-full">
            <RSSFeed />
          </div>
        </div>
      </div>
    </div>
  );
}