import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MPData } from "@/types";
import { saveSearch, deleteSavedSearch } from '@/lib/supabase/saved-searches';
import createClient from '@/lib/supabase/client';
import type { MPDebate } from '@/types/search';
import { handleMPExport } from './MPExport';

interface MPActionsProps {
  mp: MPData;
  debates?: MPDebate[];
}

export default function MPActions({ mp, debates }: MPActionsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [existingSearchId, setExistingSearchId] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const checkExistingSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: searches } = await supabase
        .from('saved_searches')
        .select('id')
        .eq('user_id', user.id)
        .eq('search_type', 'mp')
        .eq('query_state->mp', mp.member_id)
        .maybeSingle();
        
      if (searches) {
        setIsSubscribed(true);
        setExistingSearchId(searches.id);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [mp.member_id, supabase]);

  useEffect(() => {
    checkExistingSubscription();
  }, [mp.member_id, checkExistingSubscription]);

  const handleSubscribe = async () => {
    try {
      await saveSearch({
        query: `${mp.display_as}`,
        response: JSON.stringify({
          Debates: debates?.slice(0, 5),
        }),
        searchType: 'mp',
        queryState: {
          mp: mp.member_id.toString(),
        },
        citations: [],
      }, toast);

      setIsSubscribed(true);
      setNotificationOpen(false);
      
      toast({
        title: "Notifications enabled",
        description: `You'll be notified when ${mp.display_as} speaks in Parliament`,
        duration: 3000
      });
    } catch (error) {
      toast({
        title: "Error enabling notifications",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleUnsubscribe = async () => {
    try {
      if (!existingSearchId) {
        throw new Error('No existing subscription found');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await deleteSavedSearch(existingSearchId, user.id);
      
      setIsSubscribed(false);
      setExistingSearchId(null);
      
      toast({
        title: "Notifications disabled",
        description: `You'll no longer receive notifications for ${mp.display_as}`,
        duration: 3000
      });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({
        title: "Error disabling notifications",
        description: "Please try again later",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleExport = () => handleMPExport(mp, debates, toast, setIsExporting);

  return (
    <div className="flex items-center gap-2">
      {isSubscribed ? (
        <Button
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
          onClick={handleUnsubscribe}
        >
          <BellOff className="h-4 w-4 mr-2" />
          Subscribed
        </Button>
      ) : (
        <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Get Notified
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h4 className="font-medium">Notification Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Get notified when {mp.display_as} speaks in Parliament
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setNotificationOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubscribe}
                >
                  Enable Notifications
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? "Exporting..." : "Export PDF"}
      </Button>
    </div>
  );
}