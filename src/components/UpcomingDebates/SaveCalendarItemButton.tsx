'use client';

import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TimeSlot } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { isCalendarItemSaved, saveCalendarItem, deleteCalendarItem } from "@/lib/supabase/saved-calendar-items";
import { isFuture, parseISO } from "date-fns";

interface SaveCalendarItemButtonProps {
  session: TimeSlot;
  className?: string;
}

export function SaveCalendarItemButton({ session, className }: SaveCalendarItemButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  // Check if event is in the future
  const isFutureEvent = session.time?.substantive 
    ? isFuture(parseISO(session.time.substantive))
    : false;

  const handleToggle = async () => {
    if (!isFutureEvent) return;
    
    try {
      setIsSaving(true);
      
      if (isSaved) {
        const eventId = session.type === 'event' 
          ? session.event?.id 
          : `oq-${session.department}-${session.time?.substantive}`;
          
        await deleteCalendarItem(eventId ?? '');
        setIsSaved(false);

        toast({
          title: "Event removed",
          description: "Event removed from your saved items"
        });
      } else {
        await saveCalendarItem(session);
        setIsSaved(true);
        
        toast({
          title: "Event saved",
          description: "Event added to your saved items"
        });
      }
    } catch (error) {
      console.error('Error toggling calendar item:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update saved items",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if item is already saved on mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!session.event?.id && !session.department) return;
      
      const eventId = session.type === 'event' 
        ? session.event?.id 
        : `oq-${session.department}-${session.time?.substantive}`;
        
      const saved = await isCalendarItemSaved(eventId ?? '');
      setIsSaved(saved);
    };

    checkSavedStatus();
  }, [session]);

  if (!isFutureEvent) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isSaving}
      className={cn(
        "h-6 w-6 hover:bg-muted",
        isSaved && "text-primary",
        className
      )}
    >
      <Bookmark 
        className={cn(
          "h-3 w-3",
          isSaved && "fill-current"
        )} 
      />
    </Button>
  );
} 