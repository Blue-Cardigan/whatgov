'use client';

import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { useState, useContext, useEffect } from "react";
import { saveSearch, isItemSaved } from "@/lib/supabase/saved-searches";
import { useToast } from "@/hooks/use-toast";
import type { TimeSlot } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { SavedQuestionsContext } from './index';
import { SaveSearchParams } from "@/types/search";

interface SaveCalendarItemButtonProps {
  session: TimeSlot;
  item?: {
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

export function SaveCalendarItemButton({ session, item }: SaveCalendarItemButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setIsSaving(true);

      let saveParams: SaveSearchParams;

      if (session.type === 'bill' && session.bill) {
        saveParams = {
          query: session.bill.title,
          response: '',
          citations: [],
          queryState: {
            billId: session.bill.id,
            title: session.bill.title,
            currentHouse: session.bill.currentHouse,
            originatingHouse: session.bill.originatingHouse,
            date: session.time?.substantive || '',
            stage: session.bill.currentStage?.description
          },
          searchType: 'bill',
        };
      } else if (session.type === 'edm' && session.edm) {
        saveParams = {
          query: session.edm.Title,
          response: '',
          citations: [],
          queryState: {
            edmId: session.edm.id,
            title: session.edm.Title,
            primarySponsor: session.edm.PrimarySponsor.Name,
            date: session.time?.substantive || ''
          },
          searchType: 'edm',
        };
      } else if (session.type === 'oral-questions' && session.questions) {
        // Existing question save logic
        return;
      } else {
        throw new Error('Invalid session type');
      }

      await saveSearch(saveParams);
      setIsSaved(true);
      
      toast({
        title: `${session.type === 'bill' ? 'Bill' : 'EDM'} saved`,
        description: "You can find this in your saved searches"
      });
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: `Failed to save ${session.type === 'bill' ? 'bill' : 'EDM'}`,
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if item is already saved on mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (session.type === 'bill' && session.bill) {
        const saved = await isItemSaved('bill', { id: session.bill.id });
        setIsSaved(saved);
      } else if (session.type === 'edm' && session.edm) {
        const saved = await isItemSaved('edm', { id: session.edm.id });
        setIsSaved(saved);
      }
    };

    checkSavedStatus();
  }, [session]);

  const isDisabled = isSaving || isSaved || 
    (session.type === 'bill' && !session.bill) || 
    (session.type === 'edm' && !session.edm);

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