import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { QueryPart } from "./queryReducer";
import { X } from "lucide-react";

export interface SearchType {
  id: QueryPart['type'];
  label: string;
  description: string;
  icon: JSX.Element;
  placeholder: string;
  example: string;
}

interface QueryPartInputProps {
  part: QueryPart;
  searchType: SearchType | undefined;
  index: number;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onTypeChange: (index: number, newType: QueryPart['type']) => void;
  showRemove: boolean;
}

export function QueryPartInput({
  part,
  searchType,
  index,
  isFocused,
  onFocus,
  onBlur,
  onUpdate,
  onRemove,
  showRemove,
}: QueryPartInputProps) {
  return (
    <div className="group relative">
      <div className={cn(
        "flex items-center gap-4 rounded-lg border p-4 transition-all",
        isFocused ? "ring-2 ring-primary border-primary" : "bg-card hover:bg-accent/50",
        !part.isValid && "border-destructive"
      )}>
        {/* Left Icon */}
        <div className="flex-shrink-0 text-muted-foreground">
          {searchType?.icon}
        </div>

        {/* Main Content */}
        <div className="flex-grow space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{searchType?.label}</span>
              <Badge 
                variant="secondary" 
                className="text-xs font-normal"
              >
                {part.type}
              </Badge>
            </div>
          </div>

          {/* Input */}
          <div className="relative">
            <Input
              value={part.value}
              onChange={(e) => onUpdate(index, e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              placeholder={searchType?.placeholder}
              className={cn(
                "border-none bg-transparent px-0 h-9 text-base pl-2",
                !part.isValid && "text-destructive"
              )}
            />
            {!part.isValid && part.value.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                Please enter at least {part.type === 'spokenby' ? '2' : '1'} characters
              </p>
            )}
          </div>

          {/* Helper Text */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {searchType?.description}
            </p>
            {part.value && searchType?.example && (
              <p className="text-xs text-muted-foreground italic">
                Example: {searchType?.example}
              </p>
            )}
          </div>
        </div>

        {/* Remove Button */}
        {showRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove search part</span>
          </Button>
        )}
      </div>
    </div>
  );
} 