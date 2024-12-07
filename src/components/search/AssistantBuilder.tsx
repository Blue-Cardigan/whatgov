import { useState } from "react";
import { format } from "date-fns";
import { Badge, PlusCircle, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "@/hooks/use-toast";
import { Speaker } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AssistantFilters } from "./AssistantFilters";
import { AssistantConfirmationDialog } from "./AssistantConfirmationDialog";
import { AssistantQueryBuilder } from "@/lib/supabase/assistant";
import { SearchFilterParams } from "@/types/assistant";

interface AssistantBuilderProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onAssistantCreate: (assistant: {
    name: string;
    description: string;
    filters: SearchFilterParams;
    keywords: string[];
    fileIds: string[];
  }) => Promise<void>;
}

export function AssistantBuilder({
  isOpen,
  setIsOpen,
  onAssistantCreate
}: AssistantBuilderProps) {
  // Assistant details
  const [assistantName, setAssistantName] = useState("");
  const [assistantDescription, setAssistantDescription] = useState("");
  
  // Filter states
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

  // UI states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCountLoading, setIsCountLoading] = useState(false);
  const [debateCount, setDebateCount] = useState<number | null>(null);

  // Handlers
  const handleKeywordSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const getFilterDescription = () => {
    const parts = [];

    // House
    if (selectedHouse !== 'Both') {
      parts.push(`from the House of ${selectedHouse}`);
    }

    // Keywords - Keep this in the description even though it's not used for filtering
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

    // Topics
    if (selectedTopics.length > 0) {
      const topicText = topicsFilterType === 'exclusive'
        ? `covering all of these topics: ${selectedTopics.join(', ')}`
        : `covering any of these topics: ${selectedTopics.join(', ')}`;
      parts.push(topicText);
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
      return 'This assistant will include all parliamentary debates.';
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
        members: selectedMembers.map(m => m.member_id),
        members_filter_type: membersFilterType,
        parties: selectedParties,
        parties_filter_type: partiesFilterType,
        subtopics: selectedTopics,
        subtopics_filter_type: topicsFilterType,
        house: selectedHouse,
        debate_types: selectedDebateTypes,
        date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
        date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
        days_of_week: selectedDays,
      };

      const queryBuilder = new AssistantQueryBuilder();
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
        members: selectedMembers.map(m => m.member_id),
        members_filter_type: membersFilterType,
        parties: selectedParties,
        parties_filter_type: partiesFilterType,
        subtopics: selectedTopics,
        subtopics_filter_type: topicsFilterType,
        house: selectedHouse as 'Commons' | 'Lords' | 'Both',
        debate_types: selectedDebateTypes,
        date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
        date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
        days_of_week: selectedDays
      };

      const queryBuilder = new AssistantQueryBuilder();
      const fileIds = await queryBuilder.getMatchingDebates(filters);

      await onAssistantCreate({
        name: assistantName,
        description: assistantDescription,
        filters,
        keywords,
        fileIds: fileIds.map((row: { file_id: string }) => row.file_id)
      });

      setShowConfirmation(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast({
        title: "Error",
        description: "Failed to create assistant",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Assistant</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Assistant Details */}
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
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="'You specialise in...'"
                  value={assistantDescription}
                  onChange={(e) => setAssistantDescription(e.target.value)}
                />
              </div>

              {/* Keywords Section - Moved here */}
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateClick}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Assistant
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AssistantConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={createAssistant}
        name={assistantName}
        description={assistantDescription}
        filterDescription={getFilterDescription()}
        debateCount={debateCount}
        isCountLoading={isCountLoading}
      />
    </>
  );
} 