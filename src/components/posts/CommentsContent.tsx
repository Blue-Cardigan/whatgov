import type { CommentThread } from '@/types';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { CircleDot, CircleSlash, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommentsContentProps {
  comments: CommentThread[];
  isActive: boolean;
}

export function CommentsContent({ comments }: CommentsContentProps) {
  const [expandedComment, setExpandedComment] = useState<string | null>(null);

  return (
    <div className="divide-y">
      {comments.map((comment) => (
        <div key={comment.id} className="p-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3",
              comment.party === "Conservative" && "flex-row-reverse"
            )}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              <User className={cn(
                "h-8 w-8 p-1.5 rounded-full",
                comment.party === "Conservative" 
                  ? "bg-blue-500/10" 
                  : "bg-muted"
              )} />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1">
              {/* Author info */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {comment.author}
                </span>
                {comment.party && (
                  <span className="text-xs text-muted-foreground">
                    {comment.party}
                  </span>
                )}
              </div>

              {/* Message */}
              <div className="text-sm">{comment.content}</div>

              {/* Tags */}
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

              {/* Engagement */}
              <ResponseCounts
                upvotes={comment.votes.upvotes}
                downvotes={comment.votes.downvotes}
                onToggle={() => setExpandedComment(expandedComment === comment.id ? null : comment.id)}
                align={comment.party === "Conservative" ? "right" : "left"}
              />

              {/* Expanded responses */}
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
      ))}
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
  upvotes_speakers: string[];
  downvotes_speakers: string[];
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
            {upvotes_speakers.map((name, i) => (
              <div 
                key={i} 
                className="text-xs text-muted-foreground truncate"
                title={name}
              >
                {name}
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
            {downvotes_speakers.map((name, i) => (
              <div 
                key={i} 
                className="text-xs text-muted-foreground truncate"
                title={name}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}