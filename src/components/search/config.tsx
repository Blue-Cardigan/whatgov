import { Search, Quote, User, MessageSquare, CalendarIcon, Building2, Filter, Vote, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { SearchParams } from "@/lib/hansard-api";

export const searchTypes = [
    {
      id: 'text',
      label: 'General Search',
      description: 'Search across all content with flexible matching',
      icon: <Search className="h-4 w-4" />,
      placeholder: 'e.g., climate change, healthcare',
      example: 'climate change funding',
      tooltip: 'Searches all content using flexible matching'
    },
    {
      id: 'words',
      label: 'Exact Words',
      description: 'Match exact words or phrases',
      icon: <Quote className="h-4 w-4" />,
      placeholder: 'e.g., "carbon tax", "renewable energy"',
      example: 'words:"carbon tax"',
      tooltip: 'Match exact words or phrases. Use quotes for precise matching'
    },
    {
      id: 'spokenby',
      label: 'By Speaker',
      description: 'Find contributions from specific MPs or Lords',
      icon: <User className="h-4 w-4" />,
      placeholder: 'e.g., Rishi Sunak, Keir Starmer',
      example: 'spokenby:"Rishi Sunak" AND climate',
      tooltip: 'Search for contributions by specific members. Use quotes for full names.'
    },
    {
      id: 'debate',
      label: 'Debate Topic',
      description: 'Search within specific debate subjects',
      icon: <MessageSquare className="h-4 w-4" />,
      placeholder: 'e.g., net zero, NHS funding',
      example: 'debate:"net zero" AND emissions',
      tooltip: 'Search within specific debate subjects. Use quotes for full subject names.'
    }
  ];

export const getAdvancedButtons = (searchParams: SearchParams, handleOptionsChange: (updates: Partial<SearchParams>) => void) => [
    {
      id: 'timeline',
      icon: <CalendarIcon className="h-4 w-4" />,
      label: 'Timeline',
      tooltip: 'Set date range and timeline grouping',
      isActive: (options: SearchParams) => 
        !!(options.startDate || options.endDate || options.timelineGroupingSize),
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Timeline Grouping</Label>
            <Select
              value={searchParams.timelineGroupingSize || 'none'}
              onValueChange={(value) => 
                handleOptionsChange({ 
                  timelineGroupingSize: value === 'none' ? undefined : value as 'Day' | 'Month' | 'Year'
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Group results by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="Day">By Day</SelectItem>
                <SelectItem value="Month">By Month</SelectItem>
                <SelectItem value="Year">By Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Select
              value={searchParams.orderBy || 'SittingDateDesc'}
              onValueChange={(value) => 
                handleOptionsChange({ 
                  orderBy: value as 'SittingDateAsc' | 'SittingDateDesc'
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SittingDateDesc">Newest First</SelectItem>
                <SelectItem value="SittingDateAsc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    },
    {
      id: 'house',
      icon: <Building2 className="h-4 w-4" />,
      label: 'House',
      tooltip: 'Filter by parliamentary house and debate type',
      isActive: (options: SearchParams) => 
        options.house !== 'Commons' || !!options.debateType,
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>House</Label>
            <Select
              value={searchParams.house}
              onValueChange={(value) => 
                handleOptionsChange({ 
                  house: value as 'Commons' | 'Lords'
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Commons">House of Commons</SelectItem>
                <SelectItem value="Lords">House of Lords</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Debate Type</Label>
            <Select
              value={searchParams.debateType || 'all'}
              onValueChange={(value) => 
                handleOptionsChange({ 
                  debateType: value === 'all' ? undefined : value as 'debate' | 'statement' | 'answer' | 'petition'
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All debate types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="debate">Debates</SelectItem>
                <SelectItem value="statement">Written Statements</SelectItem>
                <SelectItem value="answer">Written Answers</SelectItem>
                <SelectItem value="petition">Petitions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    },
    {
      id: 'filters',
      icon: <Filter className="h-4 w-4" />,
      label: 'Filters',
      tooltip: 'Filter by department, committee, and other options',
      isActive: (options: SearchParams) => 
        !!(options.department || options.committeeTitle || options.committeeType),
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={searchParams.department || 'all-departments'}
              onValueChange={(value) => 
                handleOptionsChange({ 
                  department: value === 'all-departments' ? undefined : value 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-departments">All Departments</SelectItem>
                <SelectItem value="treasury">Treasury</SelectItem>
                <SelectItem value="home-office">Home Office</SelectItem>
                <SelectItem value="defence">Defence</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="education">Education</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Committee</Label>
            <Select
              value={searchParams.committeeTitle || 'all-committees'}
              onValueChange={(value) => 
                handleOptionsChange({ 
                  committeeTitle: value === 'all-committees' ? undefined : value 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select committee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-committees">All Committees</SelectItem>
                <SelectItem value="public-accounts">Public Accounts</SelectItem>
                <SelectItem value="treasury-committee">Treasury Committee</SelectItem>
                <SelectItem value="health-social-care">Health and Social Care</SelectItem>
                <SelectItem value="education-committee">Education Committee</SelectItem>
                <SelectItem value="defence-committee">Defence Committee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Committee Type</Label>
            <Select
              value={String(searchParams.committeeType || 'all-types')}
              onValueChange={(value) => 
                handleOptionsChange({ 
                  committeeType: value === 'all-types' ? undefined : Number(value) as 1 | 2 | 3 | 4 | undefined
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select committee type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All Types</SelectItem>
                <SelectItem value="1">Standing Committee</SelectItem>
                <SelectItem value="2">Select Committee</SelectItem>
                <SelectItem value="3">Joint Committee</SelectItem>
                <SelectItem value="4">General Committee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    },
    {
      id: 'members',
      icon: <Users className="h-4 w-4" />,
      label: 'Members',
      tooltip: 'Filter by current or former members',
      isActive: (options: SearchParams) => 
        !(options.includeFormer && options.includeCurrent),
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeCurrent"
              checked={searchParams.includeCurrent}
              onCheckedChange={(checked) => 
                handleOptionsChange({ includeCurrent: !!checked })
              }
            />
            <Label htmlFor="includeCurrent">Include Current Members</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeFormer"
              checked={searchParams.includeFormer}
              onCheckedChange={(checked) => 
                handleOptionsChange({ includeFormer: !!checked })
              }
            />
            <Label htmlFor="includeFormer">Include Former Members</Label>
          </div>
        </div>
      )
    },
    {
      id: 'divisions',
      icon: <Vote className="h-4 w-4" />,
      label: 'Divisions',
      tooltip: 'Filter by division votes and committee divisions',
      isActive: (options: SearchParams) => 
        options.withDivision || options.includeCommitteeDivisions,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="withDivision"
              checked={searchParams.withDivision}
              onCheckedChange={(checked) => 
                handleOptionsChange({ withDivision: !!checked })
              }
            />
            <Label htmlFor="withDivision">Include Division Votes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeCommitteeDivisions"
              checked={searchParams.includeCommitteeDivisions}
              onCheckedChange={(checked) => 
                handleOptionsChange({ includeCommitteeDivisions: !!checked })
              }
            />
            <Label htmlFor="includeCommitteeDivisions">Include Committee Divisions</Label>
          </div>
        </div>
      )
    }
  ];