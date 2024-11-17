import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QueryPart } from "./queryReducer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface QueryPartInputProps {
  part: QueryPart;
  index: number;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onTypeChange: (index: number, newType: QueryPart['type']) => void;
}

export function QueryPartInput({
  part,
  index,
  isFocused,
  onFocus,
  onBlur,
  onUpdate,
  onRemove,
  onTypeChange
}: QueryPartInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleTypeChange = (newType: QueryPart['type']) => {
    onTypeChange(index, newType);
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-2 rounded-lg p-2",
        isFocused ? "ring-2 ring-primary" : "bg-secondary/50",
        !part.isValid && "ring-2 ring-destructive"
      )}
    >
      <Select
        value={part.type}
        onValueChange={handleTypeChange}
      >
        <SelectTrigger className="h-8 w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="spokenby">Speaker</SelectItem>
          <SelectItem value="debate">Debate</SelectItem>
          <SelectItem value="words">Words</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1" ref={inputRef}>
        <Input
          value={part.value}
          onChange={(e) => onUpdate(index, e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={getPlaceholder(part.type)}
          className={cn("h-8", !part.isValid && "border-destructive")}
        />

        {!part.isValid && part.value.length > 0 && (
          <div className="text-xs text-destructive mt-1">
            {getErrorMessage(part)}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function getPlaceholder(type: QueryPart['type']): string {
  switch (type) {
    case 'spokenby':
      return "Enter MP name...";
    case 'debate':
      return "Enter debate topic...";
    case 'words':
      return "Enter exact phrase...";
    default:
      return "Enter search terms...";
  }
}

function getErrorMessage(part: QueryPart): string {
  switch (part.type) {
    case 'spokenby':
      return "Please enter at least 2 characters";
    case 'debate':
      return "Please enter at least 3 characters";
    case 'words':
      return "Please enter at least 1 character";
    default:
      return "Invalid input";
  }
} 