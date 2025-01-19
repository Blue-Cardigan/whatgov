import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SavedSearch } from '@/types/search';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { handleSavedMPExport } from '../search/MPProfile/MPExport';

interface MPSearchCardProps {
  search: SavedSearch;
  onDelete: () => void;
  user: User | null;
}

interface MPDebate {
  debate_id: string;
  debate_title: string;
  debate_type: string;
  debate_house: string;
  debate_date: string;
  member_name: string;
  member_party: string;
  member_constituency: string | null;
  member_role: string;
  member_contributions: string[];
}

interface ResponseData {
  Debates: MPDebate[];
}

function parseContribution(contribution: string): { content: string; references: Array<{ text: string; source: string }> } {
  try {
    return JSON.parse(contribution);
  } catch {
    return { content: contribution, references: [] };
  }
}

export function MPSearchCard({ search, onDelete }: MPSearchCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Parse the response JSON
  const responseData: ResponseData = JSON.parse(search.response);
  const firstDebate = responseData.Debates[0];

  // Early return if no debates found
  if (!firstDebate) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No debate information available
        </div>
      </Card>
    );
  }

  const handleExport = () => handleSavedMPExport(search, toast, setIsExporting);

  return (
    <Card className={cn(
      search.is_unread && "ring-2 ring-primary",
      "transition-all duration-200"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                {firstDebate.member_name}
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                >
                  {firstDebate.member_party}
                </Badge>
              </CardTitle>
              {firstDebate.member_constituency && (
                <p className="text-sm text-muted-foreground">
                  {firstDebate.member_constituency}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Saved {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleExport}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Export data
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Delete
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Latest Debate Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Latest Contribution</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Badge variant="outline" className="text-xs">
                    {firstDebate.debate_house}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {firstDebate.debate_type}
                  </Badge>
                  <span>{format(new Date(firstDebate.debate_date), 'dd MMM yyyy')}</span>
                </div>
                <h4 className="font-medium mb-3">{firstDebate.debate_title}</h4>
                <div className="space-y-2">
                  {firstDebate.member_contributions.map((contribution, index) => {
                    const parsed = parseContribution(contribution);
                    return (
                      <div key={index} className="text-sm space-y-1">
                        <p>{parsed.content}</p>
                        {parsed.references?.length > 0 && (
                          <div className="text-xs text-muted-foreground pl-4 border-l-2 mt-1">
                            {parsed.references.map((ref, refIndex) => (
                              <p key={refIndex}>
                                <span className="font-medium">{ref.text}</span>: {ref.source}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost">
                {isOpen ? (
                  <div className="flex items-center">
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Show Less
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show More
                  </div>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  );
}