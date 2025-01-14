'use client';

import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { useState, useMemo, useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TimeSlot } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { saveCalendarItem, deleteCalendarItem } from "@/lib/supabase/saved-calendar-items";
import { SavedQuestionsContext } from "@/components/UpcomingDebates";
import { useQueryClient } from '@tanstack/react-query';
import { format } from "date-fns";

type Question = NonNullable<TimeSlot['questions']>[number];

interface SaveCalendarItemButtonProps {
  session: TimeSlot;
  question?: Question;
  className?: string;
}

export function SaveCalendarItemButton({ session, question, className }: SaveCalendarItemButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { savedQuestions, setSavedQuestions } = useContext(SavedQuestionsContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const eventId = useMemo(() => {
    if (session.type === 'oral-questions') {
      const questionDate = question?.answeringWhen || session.questions?.[0]?.answeringWhen;
      if (!questionDate) return '';
      
      if (question) {
        return `oq-${session.departmentId}-${format(new Date(questionDate), 'yyyy-MM-dd')}-q${question.id}`;
      } else {
        return `oq-${session.departmentId}-${format(new Date(questionDate), 'yyyy-MM-dd')}`;
      }
    } else if (session.type === 'event' && session.event?.id) {
      const eventType = session.event.type?.toLowerCase().trim()
        .replace('debate', '')
        .replace(/\s+/g, '-')
        .trim();
      return `${eventType}-${session.event.id}`;
    } else if (session.type === 'edm' && session.edm?.id) {
      return `edm-${session.edm.id}`;
    }
    return '';
  }, [session, question]);

  const isSaved = useMemo(() => {
    return savedQuestions.has(eventId);
  }, [savedQuestions, eventId]);

  const handleToggle = async () => {
    if (!eventId) return;
    
    try {
      setIsSaving(true);
      
      if (isSaved) {
        await deleteCalendarItem(eventId);
        setSavedQuestions((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });

        toast({
          title: question ? "Question removed" : "Event removed",
          description: question 
            ? "Question removed from your saved items"
            : "Event removed from your saved items"
        });
      } else {
        await saveCalendarItem(session, question?.id);
        setSavedQuestions((prev: Set<string>) => {
          const next = new Set(prev);
          next.add(eventId);
          return next;
        });
        
        toast({
          title: question ? "Question saved" : "Event saved",
          description: question 
            ? "Question added to your saved items"
            : "Event added to your saved items"
        });
      }

      // Invalidate the saved items query to trigger a refresh
      queryClient.invalidateQueries(['savedItems']);
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