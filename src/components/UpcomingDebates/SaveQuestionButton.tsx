'use client';

import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { useState, useEffect, useContext } from "react";
import { saveSearch, isQuestionSaved } from "@/lib/supabase/saved-searches";
import { useToast } from "@/hooks/use-toast";
import type { TimeSlot } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { SavedQuestionsContext } from './index';

interface SaveQuestionButtonProps {
  session: TimeSlot;
  question?: {
    id: number;
    UIN: number;
    text: string;
    askingMembers: Array<{
      Name: string;
      PhotoUrl?: string;
      Party?: string;
      Constituency?: string;
    }>;
  };
}

export function SaveQuestionButton({ session, question }: SaveQuestionButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { savedQuestions, setSavedQuestions } = useContext(SavedQuestionsContext);
  const { toast } = useToast();

  const deadline = session.time?.deadline;
  const sessionDate = session.time?.substantive || session.time?.topical;
  const questionId = question?.id?.toString();
  const questionUIN = question?.UIN?.toString();
  const questionText = question?.text;
  const answeringMinister = session.minister?.Name;

  const handleSave = async () => {
    if (!questionText || !sessionDate || !answeringMinister) {
      toast({
        title: "Cannot save question",
        description: "Missing required question information",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);

      await saveSearch({
        query: questionText,
        response: '', // Empty as requested
        citations: [],
        queryState: {
          questionText,
          answerDate: sessionDate,
          answeringMinister,
          department: session.department,
          deadline,
          questionId,
          uin: questionUIN
        },
        searchType: 'question',
      });

      // Create unique key for saved question
      const savedKey = `${questionText}|${sessionDate}|${answeringMinister}`;
      setSavedQuestions(new Set([...savedQuestions, savedKey]));
      
      toast({
        title: "Question saved",
        description: "You can find this in your saved searches"
      });
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Failed to save question",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Create unique key for checking saved status
  const savedKey = questionText && sessionDate && answeringMinister 
    ? `${questionText}|${sessionDate}|${answeringMinister}`
    : '';

  const isDisabled = !questionText || !sessionDate || !answeringMinister || isSaving || savedQuestions.has(savedKey);
  const isSaved = savedQuestions.has(savedKey);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSave}
      disabled={isDisabled}
      className={cn(
        "h-6 w-6 hover:bg-muted",
        isSaved && "text-primary"
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