'use client';

import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TimeSlot } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { isCalendarItemSaved, saveCalendarItem, deleteCalendarItem } from "@/lib/supabase/saved-calendar-items";

// Define the Question type explicitly
type Question = {
  id: number;
  UIN: number;
  text: string;
  askingMembers: {
    Name: string;
    Constituency: string;
    Party: string;
    PhotoUrl?: string;
  }[];
};

interface SaveCalendarItemButtonProps {
  session: TimeSlot;
  question?: Question;  // Use the explicit Question type
  className?: string;
}

export function SaveCalendarItemButton({ session, question, className }: SaveCalendarItemButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  // Generate the appropriate eventId based on whether it's a question or session
  const eventId = useMemo(() => {
    if (session.type === 'event' && session.event?.id) {
      return session.event.id;
    } else if (session.type === 'oral-questions') {
      if (question) {
        // For individual questions
        return `oq-${session.department}-${session.time?.substantive}-q${question.id}`;
      } else {
        // For entire session
        return `oq-${session.department}-${session.time?.substantive}`;
      }
    } else if (session.type === 'edm' && session.edm?.id) {
      return `edm-${session.edm.id}`;
    }
    return '';
  }, [session, question]);

  const handleToggle = async () => {
    if (!eventId) return;
    
    try {
      setIsSaving(true);
      
      if (isSaved) {
        await deleteCalendarItem(eventId);
        setIsSaved(false);

        toast({
          title: question ? "Question removed" : "Event removed",
          description: question 
            ? "Question removed from your saved items"
            : "Event removed from your saved items"
        });
      } else {
        // Create modified session object for saving
        const saveData: TimeSlot = {
          ...session,
          // If this is an individual question, create a new session with just this question
          questions: question ? [{
            id: question.id,
            UIN: question.UIN,
            text: question.text,
            askingMembers: question.askingMembers
          }] : session.questions
        };
        
        await saveCalendarItem(saveData);
        setIsSaved(true);
        
        toast({
          title: question ? "Question saved" : "Event saved",
          description: question 
            ? "Question added to your saved items"
            : "Event added to your saved items"
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
      if (!eventId) return;
      const saved = await isCalendarItemSaved(eventId);
      setIsSaved(saved);
    };

    checkSavedStatus();
  }, [eventId]);

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