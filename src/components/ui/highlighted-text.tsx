interface HighlightedTextProps {
  text: string;
  searchTerm?: string;
  className?: string;
}

export function HighlightedText({ text, searchTerm, className }: HighlightedTextProps) {
  // Split text into paragraphs
  const paragraphs = text.split('\n\n');
  
  if (!searchTerm) {
    return (
      <div className={className}>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="mb-4 last:mb-0">
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {paragraphs.map((paragraph, pIndex) => {
        const parts = paragraph.split(new RegExp(`(${searchTerm})`, 'gi'));
        
        return (
          <p key={pIndex} className="mb-4 last:mb-0">
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
          </p>
        );
      })}
    </div>
  );
} 