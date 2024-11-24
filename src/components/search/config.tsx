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