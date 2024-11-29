interface HighlightedTextProps {
  text: string;
  searchTerm?: string;
}

export function HighlightedText({ text, searchTerm }: HighlightedTextProps) {
  if (!searchTerm) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) => (
        part.toLowerCase() === searchTerm?.toLowerCase() ? (
          <mark 
            key={i}
            className="bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      ))}
    </span>
  );
} 