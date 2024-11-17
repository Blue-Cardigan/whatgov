import { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import { QueryPartInput } from './QueryPartInput';
import { QueryControls } from './QueryControls';
import { QueryExamples } from './QueryExamples';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import { queryReducer, QueryPart } from './queryReducer';
import { Input } from '@/components/ui/input';

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
  const isFirstRender = useRef(true);
  const [state, dispatch] = useReducer(queryReducer, {
    parts: parseInitialValue(value).length ? parseInitialValue(value) : [{ type: 'text', value: '', isValid: true }],
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
            return part.value;
          default:
            return part.value;
        }
      })
      .filter(part => part.trim())
      .join(' ');
  }, []);

  // Single effect to handle synchronization
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const currentValue = buildQueryString(state.parts);
    if (value !== currentValue) {
      if (value === '') {
        // Handle clear case
        dispatch({ type: 'SET_PARTS', payload: [{ type: 'text', value: '', isValid: true }] });
      } else {
        // Handle external value changes
        dispatch({ type: 'SET_PARTS', payload: parseInitialValue(value) });
      }
    }
  }, [value, buildQueryString]);

  // Handlers with proper memoization
  const handleUpdatePart = useCallback((index: number, partValue: string) => {
    dispatch({ type: 'UPDATE_PART', payload: { index, value: partValue } });
    const newParts = state.parts.map((part, i) => 
      i === index ? { ...part, value: partValue } : part
    );
    const newValue = buildQueryString(newParts);
    onChange(newValue);
  }, [buildQueryString, onChange, state.parts]);

  const handleAddPart = useCallback((type: QueryPart['type']) => {
    dispatch({ type: 'ADD_PART', payload: type });
  }, []);

  const handleRemovePart = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_PART', payload: index });
    // Update parent after state changes
    setTimeout(() => {
      const newParts = state.parts.filter((_, i) => i !== index);
      onChange(buildQueryString(newParts));
    }, 0);
  }, [buildQueryString, onChange, state.parts]);

  const handleTypeChange = useCallback((index: number, newType: QueryPart['type']) => {
    dispatch({ 
      type: 'CHANGE_PART_TYPE', 
      payload: { index, partType: newType } 
    });
    // Update parent after state changes
    setTimeout(() => {
      const newParts = state.parts.map((part, i) => 
        i === index ? { ...part, type: newType, value: '' } : part
      );
      onChange(buildQueryString(newParts));
    }, 0);
  }, [buildQueryString, onChange, state.parts]);

  return (
    <div className="space-y-4">
      {/* Basic Search Mode */}
      {!showAdvanced && (
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search parliamentary debates..."
            value={state.parts[0]?.value || ''}
            onChange={(e) => handleUpdatePart(0, e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSubmit();
              }
            }}
          />
          <Button 
            onClick={onSubmit}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      )}

      {/* Advanced Search Mode */}
      {showAdvanced && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {state.parts.map((part, index) => (
              <QueryPartInput
                key={`${part.type}-${index}`}
                part={part}
                index={index}
                isFocused={state.focusedIndex === index}
                onFocus={() => dispatch({ type: 'SET_FOCUSED_INDEX', payload: index })}
                onBlur={() => dispatch({ type: 'SET_FOCUSED_INDEX', payload: null })}
                onUpdate={handleUpdatePart}
                onRemove={handleRemovePart}
                onTypeChange={handleTypeChange}
                showRemove={state.parts.length > 1}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2">
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
      )}

      {/* Controls Section */}
      <div className="flex items-center gap-4 pt-2">
        <QueryControls
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => {
            // When switching to basic, convert all parts to a single text search
            if (showAdvanced) {
              const combinedValue = buildQueryString(state.parts);
              dispatch({ 
                type: 'SET_PARTS', 
                payload: [{ type: 'text', value: combinedValue, isValid: true }] 
              });
            }
            setShowAdvanced(!showAdvanced);
          }}
          onAddPart={handleAddPart}
          house={house}
          onHouseChange={onHouseChange}
        />
      </div>

      {/* Examples Section */}
      {!showAdvanced && <QueryExamples onChange={onChange} />}
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