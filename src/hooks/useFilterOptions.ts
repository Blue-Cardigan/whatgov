import { useState, useEffect } from 'react';
import { HansardAPI, Member } from '@/lib/hansard-api';
import { useDebounce } from './useDebounce';

export function useFilterOptions() {
  const [filterOptions, setFilterOptions] = useState({
    topics: [] as string[],
    parties: [] as string[],
    memberResults: [] as Member[],
    isLoadingMembers: false,
  });

  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const debouncedMemberSearch = useDebounce(memberSearchTerm, 300);

  // Fetch static filter options
  useEffect(() => {
    const fetchOptions = async () => {
      const [topics, parties] = await Promise.all([
        HansardAPI.getTopics(),
        HansardAPI.getParties(),
      ]);
      setFilterOptions(prev => ({ ...prev, topics, parties }));
    };
    fetchOptions();
  }, []);

  // Search members
  useEffect(() => {
    const searchMembers = async () => {
      if (!debouncedMemberSearch) {
        setFilterOptions(prev => ({ ...prev, memberResults: [] }));
        return;
      }

      setFilterOptions(prev => ({ ...prev, isLoadingMembers: true }));
      try {
        const results = await HansardAPI.searchMembers(debouncedMemberSearch);
        setFilterOptions(prev => ({ 
          ...prev, 
          memberResults: results,
          isLoadingMembers: false 
        }));
      } catch (error) {
        console.error('Failed to search members:', error);
        setFilterOptions(prev => ({ ...prev, isLoadingMembers: false }));
      }
    };

    searchMembers();
  }, [debouncedMemberSearch]);

  return {
    ...filterOptions,
    setMemberSearchTerm,
  };
} 