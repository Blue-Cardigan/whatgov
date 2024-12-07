import { Search, Quote, User, MessageSquare } from "lucide-react";

export const searchTypes = [
    {
      id: 'text',
      label: 'Flexible text search',
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
      id: 'title',
      label: 'Debate Title',
      description: 'Search within debate titles',
      icon: <MessageSquare className="h-4 w-4" />,
      placeholder: 'e.g., net zero, NHS funding',
      example: 'title:"net zero" AND emissions',
      tooltip: 'Search within debate titles. Use quotes for exact titles.'
    }
  ];