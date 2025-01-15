'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Image from 'next/image';
import { format } from 'date-fns';
import { getNextParliamentImage } from '@/lib/utils/parliamentImages';

interface RSSFeedsProps {
  type: 'bills' | 'events';
}

interface BillFeed {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  stage: string;
  categories: string[];
}

interface EventFeed {
  title: string;
  link: string;
  startDate: string;
  location: string;
  id: string;
  status: 'Live' | 'Upcoming';
}

export function RSSFeeds({ type }: RSSFeedsProps) {
  const [bills, setBills] = useState<BillFeed[]>([]);
  const [events, setEvents] = useState<EventFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Fetch RSS data
        const response = await fetch(`/api/rss/${type}`);
        const data = await response.json();
        if (mounted) {
          if (type === 'bills') {
            setBills(data);
          } else {
            setEvents(data);
          }
        }

        // Load featured image
        const imageUrl = await getNextParliamentImage();
        if (mounted) {
          setFeaturedImageUrl(imageUrl);
        }
      } catch (error) {
        console.error('Error initializing RSS feeds:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [type]);

  if (isLoading) {
    return <RSSFeedsSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-primary border-l-2 border-primary pl-2">
        {type === 'bills' ? 'Latest Bills' : 'Live Events'}
      </div>
      
      {/* Featured Item with Image */}
      {((type === 'bills' ? bills : events).length > 0) && featuredImageUrl && (
        <div className="relative h-[200px] w-full overflow-hidden rounded-lg mb-6">
          <Image
            src={featuredImageUrl}
            alt="Featured"
            fill
            className="object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {type === 'bills' ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {bills[0].categories.map((category, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-primary/20 text-white rounded-full">
                      {category}
                    </span>
                  ))}
                </div>
                <a href={bills[0].link} target="_blank" rel="noopener noreferrer" 
                   className="text-white hover:text-primary-foreground/90 transition-colors">
                  <h3 className="font-medium text-lg">{bills[0].title}</h3>
                  <p className="text-sm text-white/80">{bills[0].stage}</p>
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {events[0].status === 'Live' && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs text-white">LIVE</span>
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 bg-primary/20 text-white rounded-full">
                    {events[0].location}
                  </span>
                </div>
                <a href={events[0].link} target="_blank" rel="noopener noreferrer"
                   className="text-white hover:text-primary-foreground/90 transition-colors">
                  <h3 className="font-medium text-lg">{events[0].title}</h3>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Horizontal Scrollable List */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-4">
          {(type === 'bills' ? bills : events).slice(1).map((item, index) => (
            <div key={index} className="group w-fit shrink-0">
              <a
                href={item.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-fit p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {type === 'bills' && (item as BillFeed).categories?.map((category, i) => (
                      <span key={i} className="text-[11px] px-1.5 py-0.5 bg-muted rounded-full">
                        {category}
                      </span>
                    ))}
                  </div>
                  {type === 'bills' && (
                    <p className="text-xs text-muted-foreground line-clamp-[7]">
                      {(item as BillFeed).description}
                    </p>
                  )}
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RSSFeedsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              {i < 4 && <hr className="my-2" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 