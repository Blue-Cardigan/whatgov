import { Badge } from "../ui/badge";
import { useMemo } from "react";

interface QueryExamplesProps {
  onChange: (value: string) => void;
}

const SEARCH_EXAMPLES = [
  { label: "climate change", value: "climate change" },
  { label: "Keir Starmer on NHS", value: 'spokenby:"Keir Starmer" NHS' },
  { label: "PMQs", value: 'debate:"Prime Minister\'s Questions"' },
  { label: "cost of living", value: "cost of living" },
  { label: "Rishi Sunak on immigration", value: 'spokenby:"Rishi Sunak" immigration' },
  { label: "housing crisis", value: "housing crisis" },
  { label: "energy bills", value: "energy bills" },
  { label: "Budget debates", value: 'debate:"Budget"' },
  { label: "NHS waiting times", value: "NHS waiting times" },
  { label: "education funding", value: "education funding" }
];

export function QueryExamples({ onChange }: QueryExamplesProps) {
  const examples = useMemo(() => {
    const shuffled = [...SEARCH_EXAMPLES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, []);

  return (
    <div className="text-sm">
      <p className="text-muted-foreground mb-2">Try searching for:</p>
      <div className="flex flex-wrap gap-2">
        {examples.map((example, index) => (
          <Badge 
            key={index}
            variant="secondary" 
            className="cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={() => onChange(example.value)}
          >
            {example.label}
          </Badge>
        ))}
      </div>
    </div>
  );
} 