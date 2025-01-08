import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TimeSlot } from '@/types/calendar';

interface CalendarCardProps {
  item: {
    id: string;
    event_data: TimeSlot;
    created_at: string;
  };
  onDelete: () => void;
}

export function CalendarCard({ item, onDelete }: CalendarCardProps) {
  const getEventTitle = () => {
    const eventData = item.event_data;
    
    if (!eventData) return 'Unknown Event';

    switch (eventData.type) {
      case 'oral-questions':
        return `Oral Questions: ${eventData.department}`;
      
      case 'event': {
        if (!eventData.event) return 'Unknown Event';
        // Use category as primary display, fallback to title
        const category = eventData.event.category;
        const title = eventData.event.title;
        
        if (category && title) {
          return `${category}: ${title}`;
        }
        return category || title || 'Unnamed Event';
      }
      
      case 'edm':
        return eventData.edm?.Title || 'Untitled EDM';
      
      case 'bill':
        // Handle bill type if needed
        return 'Bill Session';
      
      default:
        return 'Unknown Event';
    }
  };

  const getEventTime = () => {
    const eventData = item.event_data;
    if (!eventData) return null;

    // For events with specific start times
    if (eventData.type === 'event' && eventData.event?.startTime) {
      try {
        const startTime = format(new Date(eventData.event.startTime), 'PPP p');
        if (eventData.event.endTime) {
          const endTime = format(new Date(eventData.event.endTime), 'p');
          return `${startTime} - ${endTime}`;
        }
        return startTime;
      } catch (e) {
        console.error('Error formatting event time:', e);
      }
    }

    // For other types using time.substantive/topical
    if (eventData.time) {
      const { substantive, topical } = eventData.time;
      if (substantive && topical) {
        return `${substantive} - ${topical}`;
      }
      return substantive || topical || null;
    }

    return null;
  };

  const getEventDetails = () => {
    const eventData = item.event_data;
    if (!eventData) return null;

    const details: { icon: string; text: string }[] = [];

    // Location
    if (eventData.type === 'event' && eventData.event?.location) {
      details.push({ icon: '📍', text: eventData.event.location });
    }

    // House (if available)
    if (eventData.type === 'event' && eventData.event?.house) {
      details.push({ icon: '🏛️', text: eventData.event.house });
    }

    // Description (truncated if too long)
    if (eventData.type === 'event' && eventData.event?.description) {
      const desc = eventData.event.description;
      const truncated = desc.length > 100 ? `${desc.slice(0, 100)}...` : desc;
      details.push({ icon: '📝', text: truncated });
    }

    // Members (if any)
    if (eventData.type === 'event' && eventData.event?.members?.length) {
      const memberCount = eventData.event.members.length;
      details.push({ 
        icon: '👥', 
        text: `${memberCount} ${memberCount === 1 ? 'member' : 'members'} attending` 
      });
    }

    return details;
  };

  const details = getEventDetails();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-medium">
              {getEventTitle()}
            </CardTitle>
            {getEventTime() && (
              <p className="text-sm text-muted-foreground mt-1">
                🕒 {getEventTime()}
              </p>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete saved event?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your saved event.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TooltipTrigger>
              <TooltipContent>
                Delete event
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      {details && details.length > 0 && (
        <CardContent className="space-y-2">
          {details.map((detail, index) => (
            <p key={index} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="flex-shrink-0">{detail.icon}</span>
              <span>{detail.text}</span>
            </p>
          ))}
        </CardContent>
      )}
    </Card>
  );
} 