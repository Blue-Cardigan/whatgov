import type { CommentThread, Speaker } from '@/types';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { CircleDot, CircleSlash } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { getOneOnePortraitUrl } from '@/lib/utils';
import { PortraitFallback } from "@/components/ui/portrait-fallback";
import { createRoot } from 'react-dom/client';

interface CommentsContentProps {
  comments: CommentThread[];
  isActive: boolean;
}

export function CommentsContent({ comments }: CommentsContentProps) {
  const [expandedComment, setExpandedComment] = useState<string | null>(null);

  return (
    <div className="divide-y max-h-[600px] overflow-y-auto">
      {comments.map((comment) => {
        // Use author data directly from the comment
        const author = comment.author;
        
        return (
          <div key={comment.id} className="p-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                !author.party?.includes("Labour") && "flex-row-reverse"
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {author.memberId ? (
                  <div className="relative h-8 w-8 rounded-full overflow-hidden">
                    <Image
                      src={getOneOnePortraitUrl(Number(author.memberId))}
                      alt={author.name}
                      sizes="(max-width: 768px) 32px, 32px"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const imgElement = e.currentTarget;
                        const parentElement = imgElement.parentElement;
                        
                        if (parentElement) {
                          imgElement.style.display = 'none';
                          const fallbackElement = document.createElement('div');
                          fallbackElement.className = 'h-full w-full';
                          parentElement.appendChild(fallbackElement);
                          
                          const root = createRoot(fallbackElement);
                          root.render(
                            <PortraitFallback 
                              name={author.name} 
                              className={author.party === "Conservative" ? "bg-blue-500/10" : undefined}
                            />
                          );
                        }
                      }}
                    />
                  </div>
                ) : (
                  <PortraitFallback 
                    name={author.name}
                    className={author.party === "Conservative" ? "bg-blue-500/10" : undefined}
                  />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {author.name}
                  </span>
                  {author.party && (
                    <span className="text-xs text-muted-foreground">
                      {author.party}
                    </span>
                  )}
                  {author.constituency && (
                    <span className="text-xs text-muted-foreground">
                      ({author.constituency})
                    </span>
                  )}
                </div>

                <div className="text-sm">{comment.content}</div>

                {comment.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {comment.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <ResponseCounts
                  upvotes={comment.votes.upvotes}
                  downvotes={comment.votes.downvotes}
                  onToggle={() => setExpandedComment(expandedComment === comment.id ? null : comment.id)}
                  align={author.party === "Conservative" ? "right" : "left"}
                />

                {expandedComment === comment.id && (
                  <CompactResponseDetails 
                    upvotes_speakers={comment.votes.upvotes_speakers}
                    downvotes_speakers={comment.votes.downvotes_speakers}
                    className="mt-2"
                  />
                )}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

function ResponseCounts({
  upvotes,
  downvotes,
  onToggle,
  align = "left"
}: {
  upvotes: number;
  downvotes: number;
  onToggle: () => void;
  align?: "left" | "right";
}) {
  if (!upvotes && !downvotes) return null;
  
  return (
    <div className={cn(
      "flex items-center gap-2 text-xs",
      align === "right" && "justify-end"
    )}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 hover:bg-transparent"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {upvotes > 0 && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CircleDot className="h-3 w-3" />
              {upvotes}
            </span>
          )}
          {downvotes > 0 && (
            <span className="flex items-center gap-1 text-rose-600">
              <CircleSlash className="h-3 w-3" />
              {downvotes}
            </span>
          )}
        </div>
      </Button>
    </div>
  );
}

function CompactResponseDetails({ 
  upvotes_speakers, 
  downvotes_speakers,
  className
}: { 
  upvotes_speakers: Speaker[];
  downvotes_speakers: Speaker[];
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn("space-y-3 pt-2", className)}
    >
      {upvotes_speakers.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
            <CircleDot className="h-3 w-3" /> 
            Supported by {upvotes_speakers.length}
          </div>
          <div className="space-y-0.5">
            {upvotes_speakers.map((speaker, i) => (
              <div 
                key={i} 
                className="text-xs text-muted-foreground truncate"
                title={`${speaker.name} (${speaker.party})`}
              >
                {speaker.name} • {speaker.constituency}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {downvotes_speakers.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-rose-600 text-xs font-medium">
            <CircleSlash className="h-3 w-3" /> 
            Opposed by {downvotes_speakers.length}
          </div>
          <div className="space-y-0.5">
            {downvotes_speakers.map((speaker, i) => (
              <div 
                key={i} 
                className="text-xs text-muted-foreground truncate"
                title={`${speaker.name} (${speaker.party})`}
              >
                {speaker.name} • {speaker.constituency}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}