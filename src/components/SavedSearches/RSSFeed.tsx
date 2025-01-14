import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Loader2, 
  ExternalLink, 
  X, 
  Settings,
  RefreshCw,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  source?: string;
  isRead?: boolean;
}

interface FeedData {
  [url: string]: {
    items: FeedItem[];
    isLoading: boolean;
    lastUpdated?: Date;
    error?: string;
    unreadCount?: number;
  };
}

// Add interface for RSS API response
interface RSSApiResponse {
  items: Omit<FeedItem, 'source' | 'isRead'>[];
  title?: string;
}

export function RSSFeed() {
  const { profile, updateProfile } = useAuth();
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<string>('all');
  const [feedData, setFeedData] = useState<FeedData>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const feeds = useMemo(() => profile?.rss_feeds || [], [profile]);

  const refreshFeed = useCallback(async (url: string) => {
    setFeedData(prev => ({
      ...prev,
      [url]: { ...prev[url], isLoading: true, error: undefined }
    }));

    try {
      const response = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) throw new Error('Failed to fetch feed');
      
      const data = await response.json() as RSSApiResponse;

      // Merge new items with existing ones, preserving read status
      const existingItems = feedData[url]?.items || [];
      const newItems = data.items.map((item) => ({
        ...item,
        source: data.title || new URL(url).hostname,
        isRead: existingItems.find(existing => existing.link === item.link)?.isRead || false
      }));

      setFeedData(prev => ({
        ...prev,
        [url]: { 
          items: newItems, 
          isLoading: false,
          lastUpdated: new Date(),
          unreadCount: newItems.filter((item: FeedItem) => !item.isRead).length
        }
      }));
    } catch (error) {
      console.error('Error fetching feed:', error);
      setFeedData(prev => ({
        ...prev,
        [url]: { 
          items: prev[url]?.items || [],
          isLoading: false, 
          error: 'Failed to load feed',
          lastUpdated: new Date()
        }
      }));
    }
  }, [feedData]);

  const refreshAllFeeds = async () => {
    if (!Array.isArray(feeds)) return;
    
    setIsRefreshing(true);
    const refreshPromises = feeds.map(feed => refreshFeed(feed.url));
    
    try {
      await Promise.allSettled(refreshPromises);
      toast({
        title: "Feeds refreshed",
        description: "All feeds have been updated",
      });
    } catch (error) {
      console.error('Error refreshing feeds:', error);
      toast({
        title: "Error refreshing feeds",
        description: "Some feeds may have failed to update",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const markAsRead = (url: string, itemLink: string) => {
    setFeedData(prev => ({
      ...prev,
      [url]: {
        ...prev[url],
        items: prev[url].items.map(item => 
          item.link === itemLink ? { ...item, isRead: true } : item
        ),
        unreadCount: (prev[url].unreadCount || 0) - 1
      }
    }));
  };

  const addFeed = async () => {
    if (!newFeedUrl.trim()) return;

    setIsAdding(true);
    try {
      // Test the feed first
      const response = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newFeedUrl })
      });
      
      if (!response.ok) throw new Error('Invalid feed');
      
      const data = await response.json();
      if (!data.items.length) throw new Error('No items in feed');

      const updatedFeeds = [
        ...(profile?.rss_feeds || []),
        { 
          title: data.title || new URL(newFeedUrl).hostname,
          url: newFeedUrl,
          last_checked: new Date().toISOString()
        }
      ];

      await updateProfile({ rss_feeds: updatedFeeds });
      setNewFeedUrl('');
      setSelectedFeed(newFeedUrl);
      
      // Add new feed data
      setFeedData(prev => ({
        ...prev,
        [newFeedUrl]: { items: data.items, isLoading: false }
      }));

      toast({
        title: "Feed added",
        description: "The RSS feed has been added to your profile",
      });
    } catch (error) {
      console.error('Error adding feed:', error);
      toast({
        title: "Error adding feed",
        description: "Please check the URL and try again",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeFeed = async (url: string) => {
    try {
      const updatedFeeds = feeds.filter(feed => feed.url !== url);
      await updateProfile({ rss_feeds: updatedFeeds });
      
      // Remove feed data without creating unused variable
      setFeedData(prev => {
        const newFeedData = { ...prev };
        delete newFeedData[url];
        return newFeedData;
      });

      // Reset selection if needed
      if (selectedFeed === url) {
        setSelectedFeed('all');
      }

      toast({
        title: "Feed removed",
        description: "The RSS feed has been removed from your profile",
      });
    } catch (error) {
      console.error('Error removing feed:', error);
      toast({
        title: "Error removing feed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // Fetch all feeds on mount and when feeds change
  useEffect(() => {
    if (Array.isArray(feeds)) {
      feeds.forEach(feed => {
        if (!feedData[feed.url]) {
          refreshFeed(feed.url);
        }
      });
    }
  }, [feeds, refreshFeed, feedData]);

  useEffect(() => {
    if (profile) {
      console.log('RSS feeds from profile:', profile.rss_feeds);
      console.log('Parsed feeds:', feeds);
    }
  }, [profile, feeds]);

  const displayedItems = selectedFeed === 'all'
    ? Object.entries(feedData)
        .flatMap(([url, feed]) => 
          feed?.items?.map(item => ({ ...item, feedUrl: url })) || []
        )
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    : feedData[selectedFeed]?.items || [];

  const isLoading = selectedFeed === 'all'
    ? Object.values(feedData).some(feed => feed.isLoading)
    : feedData[selectedFeed]?.isLoading;

  const totalUnread = Object.values(feedData)
    .reduce((sum, feed) => sum + (feed.unreadCount || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">RSS Feeds</CardTitle>
          {totalUnread > 0 && (
            <Badge variant="secondary">{totalUnread} unread</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={refreshAllFeeds}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add RSS feed URL"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={addFeed}
            disabled={isAdding || !newFeedUrl}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {feeds.length > 0 && (
          <Tabs value={selectedFeed} onValueChange={setSelectedFeed}>
            <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-transparent p-0">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All
                {totalUnread > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalUnread}
                  </Badge>
                )}
              </TabsTrigger>
              {feeds.map((feed) => (
                <div key={feed.url} className="flex items-center gap-1">
                  <TabsTrigger
                    value={feed.url}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <span className="truncate max-w-[100px]">{feed.title}</span>
                    {feedData[feed.url]?.unreadCount && feedData[feed.url]?.unreadCount || 0 > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="ml-2"
                      >
                        {feedData[feed.url].unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFeed(feed.url)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </TabsList>
          </Tabs>
        )}

        <ScrollArea className="h-[calc(100vh-24rem)]">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : displayedItems.length > 0 ? (
            <div className="space-y-4">
              {displayedItems.map((item, index) => (
                <a
                  key={item.link + index}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block space-y-1 p-3 rounded-lg hover:bg-muted transition-colors ${
                    !item.isRead ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => markAsRead(selectedFeed, item.link)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className={`leading-none ${!item.isRead ? 'font-medium' : ''}`}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedFeed === 'all' && item.source && (
                          <>
                            <span>{item.source}</span>
                            <span>•</span>
                          </>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {feedData[selectedFeed]?.error ? (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-6 w-6" />
                  <p>Failed to load feed</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refreshFeed(selectedFeed)}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  <p>No feed items to display</p>
                  <p className="text-sm">
                    {feeds.length === 0 ? 'Add an RSS feed to get started' : 'Try selecting a different feed'}
                  </p>
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 