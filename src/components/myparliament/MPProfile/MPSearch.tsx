'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';

interface MPSearchProps {
  onSearch: (searchTerm: string) => void;
  initialValue?: string;
}

export function MPSearch({ onSearch, initialValue = '' }: MPSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const { dispatch } = useSearch();

  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
      dispatch({
        type: 'SET_MP_SEARCH',
        payload: { query: searchTerm.trim(), keywords: [] }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Search for an MP..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1"
      />
      <Button type="submit">
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </form>
  );
} 