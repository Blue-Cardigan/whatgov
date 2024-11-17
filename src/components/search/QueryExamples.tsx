import { Badge } from "../ui/badge";

interface QueryExamplesProps {
  onChange: (value: string) => void;
}

export function QueryExamples({ onChange }: QueryExamplesProps) {
  const examples = [
    { label: "climate change", value: "climate change" },
    { label: "Keir Starmer on NHS", value: 'spokenby:"Keir Starmer" NHS' },
    { label: "PMQs", value: 'debate:"Prime Minister\'s Questions"' }
  ];

  return (
    <div className="text-sm text-muted-foreground border-t pt-4">
      <p className="mb-2">Try these examples:</p>
      <div className="flex flex-wrap gap-2">
        {examples.map((example, index) => (
          <Badge 
            key={index}
            variant="secondary" 
            className="cursor-pointer hover:bg-secondary/80"
            onClick={() => onChange(example.value)}
          >
            {example.label}
          </Badge>
        ))}
      </div>
    </div>
  );
} 