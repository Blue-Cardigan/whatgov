import { SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useEffect } from 'react';

interface MPSearchProps {
  initialValue: string;
  onSearch: (searchTerm: string) => void;
}

export function MPSearch({ initialValue, onSearch }: MPSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch(searchTerm);
  }, [searchTerm, onSearch]);

  // Handle Enter key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Search for an MP..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-1"
      />
      <Button type="submit" size="default" className="gap-2">
        <SearchIcon className="h-4 w-4" />
        <span>Search</span>
      </Button>
    </form>
  );
} 