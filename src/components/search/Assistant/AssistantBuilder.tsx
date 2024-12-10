import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Badge, PlusCircle, X, InfoIcon, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "@/hooks/use-toast";
import { Speaker } from "@/types";
import createClient from "@/lib/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AssistantFilters } from "./AssistantFilters";
import { AssistantConfirmationDialog } from "./AssistantConfirmationDialog";
import { AssistantQueryBuilder } from "@/lib/supabase/assistant";
import { SearchFilterParams } from "@/types/assistant";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { promptTemplates } from "@/lib/assistant-prompts";
import { UpgradePopover } from "@/components/ui/upgrade-popover";
import { useEngagement } from "@/hooks/useEngagement";
import { useAuth } from "@/contexts/AuthContext";
import { TOPIC_DEFINITIONS } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AssistantBuilderProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onAssistantCreate: (assistant: {
    name: string;
    description: string;
    filters: SearchFilterParams;
    keywords: string[];
    fileIds: string[];
    promptType: keyof typeof promptTemplates;
    keepUpdated: boolean;
  }) => Promise<void>;
  mode: 'create' | 'edit';
  assistantId?: string;
  onAssistantChange?: (assistantId: string | null, openaiAssistantId: string | null) => void;
}

export function AssistantBuilder({
  isOpen,
  setIsOpen,
  onAssistantCreate,
  mode = 'create',
  assistantId,
  onAssistantChange
}: AssistantBuilderProps) {
  const { isPremium } = useAuth();
  const { hasReachedAssistantLimit, getRemainingAssistants } = useEngagement();
  
  const [assistantName, setAssistantName] = useState("");
  const [assistantDescription, setAssistantDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Speaker[]>([]);
  const [membersFilterType, setMembersFilterType] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [partiesFilterType, setPartiesFilterType] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicsFilterType, setTopicsFilterType] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [selectedHouse, setSelectedHouse] = useState<'Commons' | 'Lords' | 'Both'>('Both');
  const [selectedDebateTypes, setSelectedDebateTypes] = useState<string[]>([]);
  const [debateTypesFilterType, setDebateTypesFilterType] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [dateRange, setDateRange] = useState<DateRange>();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCountLoading, setIsCountLoading] = useState(false);
  const [debateCount, setDebateCount] = useState<number | null>(null);
  const [selectedPromptType, setSelectedPromptType] = useState<keyof typeof promptTemplates>('default');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const [keepUpdated, setKeepUpdated] = useState(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen && !isPremium) {
      setIsOpen(false);
    }
  }, [isOpen, isPremium, setIsOpen]);

  useEffect(() => {
    async function loadAssistant() {
      if (mode === 'edit' && assistantId) {
        setIsLoading(true);
        try {
          const queryBuilder = new AssistantQueryBuilder(supabase);
          const assistant = await queryBuilder.getAssistant(assistantId);
          
          if (assistant) {
            // Basic details
            setAssistantName(assistant.name);
            setAssistantDescription(assistant.description);
            setSelectedPromptType(assistant.prompt_type as keyof typeof promptTemplates);
            setKeywords(assistant.keywords || []);
            
            // Members
            setSelectedMembers(assistant.filters.members);
            setMembersFilterType(assistant.filters.members_filter_type);
            
            // Parties
            setSelectedParties(assistant.filters.parties);
            setPartiesFilterType(assistant.filters.parties_filter_type);
            
            // Topics
            setSelectedTopics(assistant.filters.subtopics);
            setTopicsFilterType(assistant.filters.subtopics_filter_type);
            
            // House
            setSelectedHouse(assistant.filters.house);
            
            // Debate Types
            setSelectedDebateTypes(assistant.filters.debate_types);
            setDebateTypesFilterType(assistant.filters.debate_types_filter_type);
            
            // Dates
            if (assistant.filters.date_from && assistant.filters.date_to) {
              setDateRange({
                from: new Date(assistant.filters.date_from),
                to: new Date(assistant.filters.date_to)
              });
            }
            
            // Days of Week
            setSelectedDays(assistant.filters.days_of_week);
          }
        } catch (error) {
          console.error('Error loading assistant:', error);
          toast({
            title: "Error",
            description: "Failed to load assistant details",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadAssistant();
  }, [mode, assistantId, supabase]);

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      if (!assistantId) return;
      
      const queryBuilder = new AssistantQueryBuilder(supabase);
      const success = await queryBuilder.deleteAssistant(assistantId);
      
      if (success) {
        setIsOpen(false);
        onAssistantChange?.(null, null);
        toast({
          title: "Assistant Deleted",
          description: "Your assistant has been deleted successfully",
        });
      } else {
        throw new Error('Failed to delete assistant');
      }
    } catch (error) {
      console.error('Error deleting assistant:', error);
      toast({
        title: "Error",
        description: "Failed to delete assistant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirmation(false);
    }
  };

  const handleKeywordSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  }, [keywordInput, keywords]);

  if (!isPremium) {
    return null;
  }

  const getFilterDescription = () => {
    const parts = [];

    // House
    if (selectedHouse !== 'Both') {
      parts.push(`from the House of ${selectedHouse}`);
    }

    // Keywords
    if (keywords.length > 0) {
      const keywordText = keywords.length === 1
        ? `with special attention to the keyword "${keywords[0]}"`
        : `with special attention to these keywords: "${keywords.join('", "')}"`;
      parts.push(keywordText);
    }

    // Members
    if (selectedMembers.length > 0) {
      const memberText = membersFilterType === 'exclusive' 
        ? `where all of these MPs spoke: ${selectedMembers.map(m => m.name).join(', ')}`
        : `where any of these MPs spoke: ${selectedMembers.map(m => m.name).join(', ')}`;
      parts.push(memberText);
    }

    // Parties
    if (selectedParties.length > 0) {
      const partyText = partiesFilterType === 'exclusive'
        ? `where each of these parties participated: ${selectedParties.join(', ')}`
        : `where any of these parties participated: ${selectedParties.join(', ')}`;
      parts.push(partyText);
    }

    // Topics - Group by main topics and count subtopics
    if (selectedTopics.length > 0) {
      const topicGroups = new Map();
      
      // Group selected topics by their main topic
      selectedTopics.forEach(subtopic => {
        const mainTopic = Object.entries(TOPIC_DEFINITIONS).find(([, subtopics]) => 
          subtopics.includes(subtopic as never)
        )?.[0];
        
        if (mainTopic) {
          if (!topicGroups.has(mainTopic)) {
            topicGroups.set(mainTopic, 0);
          }
          topicGroups.set(mainTopic, topicGroups.get(mainTopic) + 1);
        }
      });

      const topicText = Array.from(topicGroups.entries())
        .map(([topic, count]) => `${topic} (${count} subtopics)`)
        .join(', ');

      parts.push(
        topicsFilterType === 'exclusive'
          ? `covering all selected subtopics in: ${topicText}`
          : `covering any selected subtopics in: ${topicText}`
      );
    }

    // Debate Types
    if (selectedDebateTypes.length > 0) {
      const typeText = debateTypesFilterType === 'exclusive'
        ? `of all these types: ${selectedDebateTypes.join(', ')}`
        : `of any of these types: ${selectedDebateTypes.join(', ')}`;
      parts.push(typeText);
    }

    // Date Range
    if (dateRange?.from || dateRange?.to) {
      const dateText = [];
      if (dateRange.from) dateText.push(`after ${format(dateRange.from, 'PPP')}`);
      if (dateRange.to) dateText.push(`before ${format(dateRange.to, 'PPP')}`);
      parts.push(dateText.join(' and '));
    }

    // Days of Week
    if (selectedDays.length > 0) {
      parts.push(`occurring on ${selectedDays.join('s, ')}s`);
    }

    if (parts.length === 0) {
      return 'This assistant will include all parliamentary debates for the current government.';
    }
    
    // Join parts with appropriate punctuation and conjunctions
    let description = 'This assistant will include debates ';
    
    if (parts.length === 1) {
      description += parts[0] + '.';
    } else if (parts.length === 2) {
      description += `${parts[0]} and ${parts[1]}.`;
    } else {
      const lastPart = parts.pop();
      description += `${parts.join('; ')}, and ${lastPart}.`;
    }

    return description;
  };

  const countMatchingDebates = async () => {
    setIsCountLoading(true);
    try {
      const filters: SearchFilterParams = {
        members: selectedMembers.map(m => ({
          member_id: m.member_id,
          memberId: m.member_id.toString(),
          name: m.display_as,
          display_as: m.display_as,
          party: m.party,
          constituency: m.constituency
        })),
        members_filter_type: membersFilterType,
        parties: selectedParties,
        parties_filter_type: partiesFilterType,
        subtopics: selectedTopics,
        subtopics_filter_type: topicsFilterType,
        house: selectedHouse,
        debate_types: selectedDebateTypes,
        debate_types_filter_type: debateTypesFilterType,
        date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
        date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
        days_of_week: selectedDays,
      };

      const queryBuilder = new AssistantQueryBuilder(supabase);
      const fileIds = await queryBuilder.getMatchingDebates(filters);
      setDebateCount(fileIds.length);
    } catch (error) {
      console.error('Error counting debates:', error);
      toast({
        title: "Error",
        description: "Failed to count matching debates",
        variant: "destructive",
      });
    } finally {
      setIsCountLoading(false);
    }
  };

  const handleCreateClick = async () => {
    if (!assistantName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your assistant",
        variant: "destructive",
      });
      return;
    }

    await countMatchingDebates();
    setShowConfirmation(true);
  };

  const createAssistant = async () => {
    try {
      const filters: SearchFilterParams = {
        members: selectedMembers.map(m => ({
          member_id: m.member_id,
          memberId: m.member_id.toString(),
          name: m.display_as,
          display_as: m.display_as,
          party: m.party,
          constituency: m.constituency
        })),
        members_filter_type: membersFilterType,
        parties: selectedParties,
        parties_filter_type: partiesFilterType,
        subtopics: selectedTopics,
        subtopics_filter_type: topicsFilterType,
        house: selectedHouse as 'Commons' | 'Lords' | 'Both',
        debate_types: selectedDebateTypes,
        debate_types_filter_type: debateTypesFilterType,
        date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
        date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
        days_of_week: selectedDays,
      };

      const queryBuilder = new AssistantQueryBuilder(supabase);
      const fileIds = await queryBuilder.getMatchingDebates(filters);

      if (mode === 'edit' && assistantId) {
        // Update existing assistant
        const response = await fetch('/api/assistant/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assistantId,
            name: assistantName,
            description: assistantDescription,
            promptType: selectedPromptType,
            filters,
            keywords,
            fileIds: fileIds.map((row: { file_id: string }) => row.file_id),
            keepUpdated
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update assistant');
        }
      } else {
        // Create new assistant
        await onAssistantCreate({
          name: assistantName,
          description: assistantDescription,
          filters,
          keywords,
          fileIds: fileIds.map((row: { file_id: string }) => row.file_id),
          promptType: selectedPromptType,
          keepUpdated
        });
      }

      await onAssistantCreate({
        name: assistantName,
        description: assistantDescription,
        filters,
        keywords,
        fileIds: [],
        promptType: selectedPromptType,
        keepUpdated
      });

      setIsOpen(false);
      toast({
        title: mode === 'edit' ? "Assistant Updated" : "Assistant Created",
        description: mode === 'edit' 
          ? "Your assistant has been updated successfully"
          : "Your new assistant is ready to use",
      });
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast({
        title: "Error",
        description: "Failed to create assistant. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit Assistant' : 'Create Custom Assistant'}
            </DialogTitle>
            <DialogDescription>
              Configure your custom AI assistant to analyze parliamentary debates based on your specific requirements.
            </DialogDescription>
            {!isPremium && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>{getRemainingAssistants()} assistants remaining</span>
                <UpgradePopover feature="assistant">
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <InfoIcon className="h-4 w-4" />
                  </Button>
                </UpgradePopover>
              </div>
            )}
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading assistant details...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Assistant Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Climate Change Specialist"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                  />
                </div>

                {/* Prompt Type Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="promptType">Assistant Type</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon 
                            className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                          />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[350px] whitespace-pre-wrap">
                          {promptTemplates[selectedPromptType]?.split('${')[0] || 'Select a prompt type'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={selectedPromptType}
                    onValueChange={(value: keyof typeof promptTemplates) => setSelectedPromptType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">General Purpose</SelectItem>
                      <SelectItem value="legislative">Legislative Analysis</SelectItem>
                      <SelectItem value="policy">Policy Impact</SelectItem>
                      <SelectItem value="scrutiny">Parliamentary Scrutiny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description - only show for default prompt type */}
                {selectedPromptType === 'default' && (
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="e.g., newsletter-style analyses for an audience of campaigners"
                      value={assistantDescription}
                      onChange={(e) => setAssistantDescription(e.target.value)}
                    />
                  </div>
                )}

                {/* Keywords Section */}
                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <p className="text-sm text-muted-foreground">
                      Add keywords to help focus the assistant&apos;s responses. Press Enter to add each keyword.
                  </p>
                  <Input
                      placeholder="Type a keyword and press Enter..."
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={handleKeywordSubmit}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                      {keywords.map((keyword) => (
                      <Badge 
                          key={keyword}
                          className="group flex items-center gap-1 pr-1"
                      >
                          {keyword}
                          <button
                          onClick={() => setKeywords(keywords.filter(k => k !== keyword))}
                          className="ml-1 rounded-full p-1 hover:bg-muted-foreground/20"
                          >
                          <X className="h-3 w-3" />
                          </button>
                      </Badge>
                      ))}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <AssistantFilters
                selectedMembers={selectedMembers}
                membersFilterType={membersFilterType}
                onMembersFilterTypeChange={setMembersFilterType}
                onMemberSelect={(member) => setSelectedMembers([...selectedMembers, member])}
                onMemberRemove={(memberId) => setSelectedMembers(selectedMembers.filter(m => m.member_id.toString() !== memberId))}
                selectedParties={selectedParties}
                partiesFilterType={partiesFilterType}
                onPartiesFilterTypeChange={setPartiesFilterType}
                onPartySelect={(party) => setSelectedParties([...selectedParties, party])}
                onPartyRemove={(party) => setSelectedParties(selectedParties.filter(p => p !== party))}
                selectedTopics={selectedTopics}
                topicsFilterType={topicsFilterType}
                onTopicsFilterTypeChange={setTopicsFilterType}
                onTopicSelect={(topicString) => {
                  const topics = topicString.split(',');
                  setSelectedTopics(prev => [...new Set([...prev, ...topics])]);
                }}
                onTopicRemove={(topicString) => {
                  const topics = topicString.split(',');
                  setSelectedTopics(prev => prev.filter(t => !topics.includes(t)));
                }}
                selectedHouse={selectedHouse}
                onHouseChange={setSelectedHouse}
                selectedDebateTypes={selectedDebateTypes}
                debateTypesFilterType={debateTypesFilterType}
                onDebateTypesFilterTypeChange={setDebateTypesFilterType}
                onDebateTypeSelect={(type) => setSelectedDebateTypes([...selectedDebateTypes, type])}
                onDebateTypeRemove={(type) => setSelectedDebateTypes(selectedDebateTypes.filter(t => t !== type))}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                selectedDays={selectedDays}
                onDaySelect={(day) => setSelectedDays([...selectedDays, day])}
                onDayRemove={(day) => setSelectedDays(selectedDays.filter(d => d !== day))}
              />

              {/* New Checkbox for Keep Updated Option */}
              <div className="space-y-2">
                <Label>Keep Assistant Updated</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={keepUpdated}
                    onCheckedChange={(checked) => setKeepUpdated(checked === true)}
                    id="keep-updated"
                  />
                  <Label htmlFor="keep-updated" className="text-sm leading-none cursor-pointer">
                    Keep Assistant updated with new debates
                  </Label>
                </div>
              </div>

              <div className="flex justify-between gap-2">
                {/* Add left-aligned delete button in edit mode */}
                {mode === 'edit' && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete Assistant
                  </Button>
                )}
                
                {/* Right-aligned buttons group */}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  {mode === 'edit' ? (
                    <Button onClick={handleCreateClick}>
                      Save Changes
                    </Button>
                  ) : hasReachedAssistantLimit() ? (
                    <UpgradePopover feature="assistant">
                      <Button>
                        Create Assistant
                      </Button>
                    </UpgradePopover>
                  ) : (
                    <Button onClick={handleCreateClick}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Assistant
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your assistant &quot;{assistantName}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssistantConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={createAssistant}
        name={assistantName}
        description={assistantDescription}
        filterDescription={getFilterDescription()}
        debateCount={debateCount}
        isCountLoading={isCountLoading}
        mode={mode}
      />
    </>
  );
} 