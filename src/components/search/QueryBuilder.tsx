import { useState, useEffect, useCallback, useReducer } from 'react';
import { QueryPartInput } from './QueryPartInput';
import { QueryControls } from './QueryControls';
import { QueryExamples } from './QueryExamples';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import { queryReducer, QueryPart } from './queryReducer';

interface QueryBuilderProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onClear: () => void;
    house: 'Commons' | 'Lords';
    onHouseChange: (house: 'Commons' | 'Lords') => void;
}

export function QueryBuilder({ 
  value, 
  onChange,
  onSubmit,
  onClear,
  house,
  onHouseChange,
}: QueryBuilderProps) {
  const [state, dispatch] = useReducer(queryReducer, {
    parts: parseInitialValue(value),
    focusedIndex: null
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Memoize the query string builder
  const buildQueryString = useCallback((parts: QueryPart[]) => {
    return parts
      .map(part => {
        switch (part.type) {
          case 'spokenby':
            return `spokenby:"${part.value}"`;
          case 'debate':
            return `debate:"${part.value}"`;
          case 'words':
            return `words:"${part.value}"`;
          default:
            return part.value;
        }
      })
      .join(' ');
  }, []);

  // Update parts when value changes externally
  useEffect(() => {
    dispatch({ type: 'SET_PARTS', payload: parseInitialValue(value) });
  }, [value]);

  // Handlers with proper memoization
  const handleUpdatePart = useCallback((index: number, value: string) => {
    dispatch({ type: 'UPDATE_PART', payload: { index, value } });
  }, []);

  const handleAddPart = useCallback((type: QueryPart['type']) => {
    dispatch({ type: 'ADD_PART', payload: type });
  }, []);

  const handleRemovePart = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_PART', payload: index });
  }, []);

  const handleTypeChange = useCallback((index: number, newType: QueryPart['type']) => {
    dispatch({ 
      type: 'CHANGE_PART_TYPE', 
      payload: { index, partType: newType } 
    });
  }, []);

  // Update parent component when parts change
  useEffect(() => {
    onChange(buildQueryString(state.parts));
  }, [state.parts, buildQueryString, onChange]);

  return (
    <div className="space-y-4">
      {/* Active Query Parts */}
      <div className="flex flex-wrap gap-2">
        {state.parts.map((part, index) => (
          <QueryPartInput
            key={index}
            part={part}
            index={index}
            isFocused={state.focusedIndex === index}
            onFocus={() => dispatch({ type: 'SET_FOCUSED_INDEX', payload: index })}
            onBlur={() => dispatch({ type: 'SET_FOCUSED_INDEX', payload: null })}
            onUpdate={handleUpdatePart}
            onRemove={handleRemovePart}
            onTypeChange={handleTypeChange}
          />
        ))}
      </div>

      <div className="flex gap-4 items-center">
        <QueryControls
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          onAddPart={handleAddPart}
          house={house}
          onHouseChange={onHouseChange}
        />

        <div className="ml-auto flex gap-2">
          {value && (
            <Button 
              variant="outline" 
              onClick={onClear}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
          
          <Button 
            onClick={onSubmit}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      <QueryExamples onChange={onChange} />
    </div>
  );
}

// Move parsing logic to a separate function
function parseInitialValue(value: string): QueryPart[] {
  if (!value) return [];

  const matches = value.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return matches.map(match => {
    if (match.startsWith('spokenby:')) {
      return { 
        type: 'spokenby' as const, 
        value: match.slice(9).replace(/"/g, ''),
        isValid: true 
      };
    } else if (match.startsWith('debate:')) {
      return { 
        type: 'debate' as const, 
        value: match.slice(7).replace(/"/g, ''),
        isValid: true 
      };
    } else if (match.startsWith('words:')) {
      return { 
        type: 'words' as const, 
        value: match.slice(6).replace(/"/g, ''),
        isValid: true 
      };
    } else {
      return { 
        type: 'text' as const, 
        value: match.replace(/"/g, ''),
        isValid: true 
      };
    }
  });
} 