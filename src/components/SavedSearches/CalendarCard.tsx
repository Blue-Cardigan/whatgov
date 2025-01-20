import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Calendar, Users, Clock, MapPin, FileText, Download, ExternalLink } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, 
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TimeSlot } from '@/types/calendar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
import { exportToPDF } from '@/lib/pdf-export';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarCardProps {
  item: {
    id: string;
    event_data: TimeSlot;
    created_at: string;
    date: string;
    debate_ids?: string[];
    is_unread?: boolean;
  };
  onDelete: () => void;
  onDownload: () => void;
}

export function CalendarCard({ item, onDelete }: CalendarCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { isProfessional } = useAuth();

  const formatSearchContent = () => {
    const eventData = item.event_data;
    let content = '';

    if (eventData.type === 'edm' && eventData.edm) {
      const { edm } = eventData;
      content = `# Early Day Motion ${edm.id}
## Title
**${edm.title}**

## Details
- **Date Tabled:** ${format(new Date(edm.dateTabled), 'PPP')}
${edm.primarySponsor ? `- **Primary Sponsor:** ${edm.primarySponsor.name} (${edm.primarySponsor.party})` : ''}

## Motion Text
${edm.text}`;
    } 
    else if (eventData.type === 'oral-questions') {
      content = `# Oral Questions Session
## Department
**${eventData.department}**

## Details
- **Date:** ${format(new Date(item.date), 'PPP')}
${eventData.ministerTitle ? `- **Minister:** ${eventData.ministerTitle}` : ''}`;
    }
    else if (eventData.type === 'event' && eventData.event) {
      const { event } = eventData;
      content = `
## Event Details
- **Type:** ${event.type}
${event.category ? `- **Category:** ${event.category}` : ''}
${event.startTime ? `- **Date and Time:** ${format(new Date(event.startTime), 'PPP p')}` : ''}
${event.location ? `- **Location:** ${event.location}` : ''}

${event.description ? `## Description\n${event.description}` : ''}`;
    }

    // Add related debates section if any exist
    if (item.debate_ids?.length) {
      content += `\n\n## Related Debates
${item.debate_ids.map((id, index) => `[${index + 1}] Debate: https://whatgov.co.uk/debate/${id}`).join('\n')}`;
    }

    return content;
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const title = item.event_data.edm?.title || 
                   (item.event_data.type === 'oral-questions' ? `Oral Questions: ${item.event_data.department}` : 
                   item.event_data.event?.title || 'Calendar Event');

      await exportToPDF({
        title,
        content: formatSearchContent(),
        date: new Date(item.created_at),
        citations: item.debate_ids || [],
        searchType: 'calendar',
        markdown: true
      });
    } catch (error) {
      console.error('Error exporting calendar item:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your calendar item",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderEventContent = () => {
    const eventData = item.event_data;
    
    const renderDebateLinks = () => {
      if (!item.debate_ids?.length) return null;
      
      return (
        <div className="mt-3 space-y-2">
          <div className="text-sm font-medium">Related Debates:</div>
          {item.debate_ids.map((url: string, index: number) => (
            <Link
              key={index}
              href={`/debate/${url}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Debate {item.debate_ids?.length && item.debate_ids.length > 1 ? index + 1 : ''}
            </Link>
          ))}
        </div>
      );
    };

    if (eventData.type === 'edm' && eventData.edm) {
      const { edm } = eventData;
      return (
        <>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-medium">
                    {edm.title}
                  </CardTitle>
                  <span className={cn(
                    "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                  )}>
                    EDM {edm.id}
                  </span>
                </div>
                {edm.primarySponsor && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Tabled by {edm.primarySponsor.name} ({edm.primarySponsor.party})
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                  <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleExport}
                        disabled={isExporting || !isProfessional}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Export event
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DeleteButton onDelete={onDelete} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Tabled on {format(new Date(edm.dateTabled), 'PPP')}</span>
            </div>
            <div className="flex gap-2">
              <FileText className="h-4 w-4 flex-shrink-0 mt-1 text-muted-foreground" />
              <p className="text-sm line-clamp-3">
                {edm.text}
              </p>
            </div>
            {renderDebateLinks()}
          </CardContent>
        </>
      );
    }

    if (eventData.type === 'oral-questions') {
      return (
        <>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base font-medium">
                  Oral Questions
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {eventData.department}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleExport}
                        disabled={isExporting}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Export event
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DeleteButton onDelete={onDelete} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(item.date), 'PPP')}</span>
            </div>
            {eventData.ministerTitle && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{eventData.ministerTitle}</span>
              </div>
            )}
            {renderDebateLinks()}
          </CardContent>
        </>
      );
    }

    if (eventData.type === 'event' && eventData.event) {
      const { event } = eventData;
      return (
        <>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-medium">
                    {event.title}
                  </CardTitle>
                  {event.category && (
                    <span className={cn(
                      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                      "bg-primary/10 text-primary"
                    )}>
                      {event.category}
                    </span>
                  )}
                </div>
                {event.type && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.type}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleExport}
                        disabled={isExporting}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Export event
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DeleteButton onDelete={onDelete} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {event.startTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{format(new Date(event.startTime), 'PPP p')}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
            {event.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {event.description}
              </p>
            )}
            {renderDebateLinks()}
          </CardContent>
        </>
      );
    }

    return (
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-medium">
            Unknown Event Type
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Export event
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>
      </CardHeader>
    );
  };

  return (
    <Card className={cn(
      item.is_unread && "ring-2 ring-primary",
      "transition-all duration-200"
    )}>
      {renderEventContent()}
    </Card>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
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
  );
} 