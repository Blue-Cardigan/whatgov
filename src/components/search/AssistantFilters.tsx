import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Speaker } from "@/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DateRange } from "react-day-picker"
import { searchMembers } from "@/lib/supabase/myparliament";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TOPIC_DEFINITIONS, DEBATE_TYPES, partyColours } from "@/lib/utils";

interface AssistantFiltersProps {
  // Members
  selectedMembers: Speaker[];
  membersFilterType: 'inclusive' | 'exclusive';
  onMembersFilterTypeChange: (value: 'inclusive' | 'exclusive') => void;
  onMemberSelect: (member: Speaker) => void;
  onMemberRemove: (memberId: string) => void;

  // Parties
  selectedParties: string[];
  partiesFilterType: 'inclusive' | 'exclusive';
  onPartiesFilterTypeChange: (value: 'inclusive' | 'exclusive') => void;
  onPartySelect: (party: string) => void;
  onPartyRemove: (party: string) => void;

  // Topics
  selectedTopics: string[];
  topicsFilterType: 'inclusive' | 'exclusive';
  onTopicsFilterTypeChange: (value: 'inclusive' | 'exclusive') => void;
  onTopicSelect: (topic: string) => void;
  onTopicRemove: (topic: string) => void;

  // House
  selectedHouse: 'Commons' | 'Lords' | 'Both';
  onHouseChange: (house: 'Commons' | 'Lords' | 'Both') => void;

  // Debate Types
  selectedDebateTypes: string[];
  debateTypesFilterType: 'inclusive' | 'exclusive';
  onDebateTypesFilterTypeChange: (value: 'inclusive' | 'exclusive') => void;
  onDebateTypeSelect: (type: string) => void;
  onDebateTypeRemove: (type: string) => void;

  // Date Range
  dateRange: DateRange | undefined;
  onDateRangeChange: (date: DateRange | undefined) => void;

  // Days of Week
  selectedDays: string[];
  onDaySelect: (day: string) => void;
  onDayRemove: (day: string) => void;

//   // Data sources
//   parties: string[];
//   topics: string[];
//   locations: string[];
//   debateTypes: string[];
}

interface FilterTypeToggleProps {
  type: string;
  value: 'inclusive' | 'exclusive';
  onChange: (value: 'inclusive' | 'exclusive') => void;
}

function FilterTypeToggle({ 
  type, 
  value, 
  onChange,
  options = {
    inclusive: 'Add all debates which include at least one',
    exclusive: 'Include only debates which include at least one'
  }
}: FilterTypeToggleProps & {
  options?: {
    inclusive: string;
    exclusive: string;
  }
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground border rounded-md p-2 bg-muted/50">
      <span>
        {`${value === 'inclusive' ? options.inclusive : options.exclusive} of the selected ${type}`}
      </span>
      <Switch
        checked={value === 'exclusive'}
        onCheckedChange={(checked) => onChange(checked ? 'exclusive' : 'inclusive')}
        className="data-[state=checked]:bg-primary shrink-0"
      />
    </div>
  );
}

export function AssistantFilters({
  // Destructure all props
  selectedMembers,
  membersFilterType,
  onMembersFilterTypeChange,
  onMemberSelect,
  onMemberRemove,
  selectedParties,
  partiesFilterType,
  onPartiesFilterTypeChange,
  onPartySelect,
  onPartyRemove,
  selectedTopics,
  topicsFilterType,
  onTopicsFilterTypeChange,
  onTopicSelect,
  onTopicRemove,
  selectedHouse,
  onHouseChange,
  selectedDebateTypes,
  onDebateTypeSelect,
  onDebateTypeRemove,
  dateRange,
  onDateRangeChange,
  selectedDays,
  onDaySelect,
  onDayRemove,
}: AssistantFiltersProps) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Local state for search inputs
  const [membersSearch, setMembersSearch] = useState("");

  // Add new state for members search
  const [membersSearchResults, setMembersSearchResults] = useState<Speaker[]>([]);
  const [membersSearchLoading, setMembersSearchLoading] = useState(false);

  // Replace the existing filteredMembers function with useEffect for search
  useEffect(() => {
    const searchMembersDebounced = async () => {
      if (!membersSearch.trim() || membersSearch.length < 2) {
        setMembersSearchResults([]);
        return;
      }

      setMembersSearchLoading(true);
      try {
        const results = await searchMembers(membersSearch);
        const speakers: Speaker[] = results.map(member => ({
          member_id: member.member_id,
          memberId: member.member_id.toString(),
          name: member.display_as,
          display_as: member.display_as,
          party: member.party,
          constituency: member.constituency
        }));
        setMembersSearchResults(speakers);
      } catch (error) {
        console.error('Error searching members:', error);
        toast({
          title: "Error",
          description: "Failed to search members",
          variant: "destructive",
        });
      } finally {
        setMembersSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchMembersDebounced, 300);
    return () => clearTimeout(timeoutId);
  }, [membersSearch]);

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Select which parliamentary debates to include in this research assistant&apos;s knowledge base. 
          The assistant will only be able to reference and analyze the debates that match your criteria below.
        </p>
      </div>

      <Tabs defaultValue="topics" className="w-full">
        <TabsList>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="members">Members & Parties</TabsTrigger>
          <TabsTrigger value="debates">Debate Details</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="space-y-4 mt-4">
          {/* Topics Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topics & Subtopics</Label>
              <FilterTypeToggle 
                type="topics"
                value={topicsFilterType}
                onChange={onTopicsFilterTypeChange}
                options={{
                  inclusive: "Add all debates which include at least one",
                  exclusive: "Include only debates which include at least one"
                }}
              />
            </div>
            
            <ScrollArea className="h-[500px] border rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(TOPIC_DEFINITIONS).map(([topic, subtopics]) => {
                  // Calculate if all subtopics are selected
                  const allSubtopicsSelected = subtopics.every(subtopic => 
                    selectedTopics.includes(subtopic)
                  );
                  
                  return (
                    <div key={topic} className="space-y-3 border rounded-md p-4">
                      <div className="flex items-start gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium leading-none">
                              {topic}
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({subtopics.length})
                              </span>
                            </Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                if (allSubtopicsSelected) {
                                  // Deselect all subtopics at once
                                  const topicsToRemove = [...subtopics];
                                  onTopicRemove(topicsToRemove.join(','));
                                } else {
                                  // Select all subtopics at once
                                  const topicsToAdd = subtopics.filter(subtopic => !selectedTopics.includes(subtopic));
                                  onTopicSelect(topicsToAdd.join(','));
                                }
                              }}
                            >
                              {allSubtopicsSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {subtopics.map((subtopic) => (
                              <div key={subtopic} className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedTopics.includes(subtopic)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      onTopicSelect(subtopic);
                                    } else {
                                      onTopicRemove(subtopic);
                                    }
                                  }}
                                  id={`subtopic-${subtopic}`}
                                />
                                <Label
                                  htmlFor={`subtopic-${subtopic}`}
                                  className="text-sm leading-none cursor-pointer"
                                >
                                  {subtopic}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Members & Parties Tab */}
        <TabsContent value="members" className="space-y-4 mt-4">
          {/* Members Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Members</Label>
              <FilterTypeToggle 
                type="members"
                value={membersFilterType}
                onChange={onMembersFilterTypeChange}
                options={{
                  inclusive: "Add all debates which include at least one",
                  exclusive: "Include only debates which include at least one"
                }}
              />
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search members..."
                  value={membersSearch}
                  onChange={(e) => setMembersSearch(e.target.value)}
                  className="w-full"
                />
                {membersSearchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>

              {membersSearch.length >= 2 && membersSearchResults.length > 0 && (
                <ScrollArea className="border rounded-md max-h-[200px]">
                  {membersSearchResults.map((member) => (
                    <button
                      key={member.member_id}
                      className="w-full px-4 py-2 text-left hover:bg-muted flex flex-col"
                      onClick={() => {
                        if (!selectedMembers.some(m => m.member_id === member.member_id)) {
                          onMemberSelect(member);
                        }
                        setMembersSearch("");
                      }}
                    >
                      <span>{member.display_as}</span>
                      <span className="text-sm text-muted-foreground">
                        {member.party}{member.constituency ? ` • ${member.constituency}` : ''}
                      </span>
                    </button>
                  ))}
                </ScrollArea>
              )}

              {/* Selected Members Display */}
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <Badge
                    key={member.member_id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {member.display_as}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => onMemberRemove(member.member_id.toString())}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Parties Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Parties</Label>
              <FilterTypeToggle 
                type="parties"
                value={partiesFilterType}
                onChange={onPartiesFilterTypeChange}
                options={{
                  inclusive: "Add all debates which include at least one",
                  exclusive: "Include only debates which include all"
                }}
              />
            </div>
            
            <ScrollArea className="h-[300px] border rounded-md p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.keys(partyColours).map((party) => (
                  <div key={party} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedParties.includes(party)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onPartySelect(party);
                        } else {
                          onPartyRemove(party);
                        }
                      }}
                      id={`party-${party}`}
                    />
                    <Label
                      htmlFor={`party-${party}`}
                      className="text-sm leading-none cursor-pointer"
                    >
                      {party}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Debate Details Tab */}
        <TabsContent value="debates" className="space-y-6 mt-4">
          {/* House Selection */}
          <div className="space-y-4">
            <Label>House</Label>
            <RadioGroup
              value={selectedHouse}
              onValueChange={onHouseChange}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Commons" id="commons" />
                <Label htmlFor="commons">Commons</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Lords" id="lords" />
                <Label htmlFor="lords">Lords</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Both" id="both" />
                <Label htmlFor="both">Both</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Debate Types Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Debate Types</Label>
            </div>
            
            {/* Commons Types */}
            {(selectedHouse === 'Commons' || selectedHouse ==='Both') && (
              <div className="space-y-3 border rounded-md p-4">
                <Label className="font-medium">Commons</Label>
                <ScrollArea className="min-h-[50px] pr-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {DEBATE_TYPES.Commons.map((type) => (
                      <div key={type.type} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedDebateTypes.includes(type.type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onDebateTypeSelect(type.type);
                            } else {
                              onDebateTypeRemove(type.type);
                            }
                          }}
                          id={`type-${type.type}`}
                        />
                        <Label
                          htmlFor={`type-${type.type}`}
                          className="text-sm leading-none cursor-pointer"
                        >
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Lords Types */}
            {(selectedHouse === 'Lords' || selectedHouse ==='Both') && (
              <div className="space-y-3 border rounded-md p-4">
                <Label className="font-medium">Lords</Label>
                <ScrollArea className="min-h-[20px] pr-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {DEBATE_TYPES.Lords.map((type) => (
                      <div key={type.type} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedDebateTypes.includes(type.type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onDebateTypeSelect(type.type);
                            } else {
                              onDebateTypeRemove(type.type);
                            }
                          }}
                          id={`type-${type.type}`}
                        />
                        <Label
                          htmlFor={`type-${type.type}`}
                          className="text-sm leading-none cursor-pointer"
                        >
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Date Range Section */}
          <div className="space-y-4">
            <Label>Date Range</Label>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={onDateRangeChange}
            />
          </div>

          {/* Days of Week Section */}
          <div className="space-y-4">
            <Label>Days of Week</Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <Badge
                  key={day}
                  variant={selectedDays.includes(day) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => 
                    selectedDays.includes(day) 
                      ? onDayRemove(day)
                      : onDaySelect(day)
                  }
                >
                  {day}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
