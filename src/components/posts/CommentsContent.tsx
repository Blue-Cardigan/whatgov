import type { CommentThread, CommentSpeaker } from '@/types';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { CircleDot, CircleSlash, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from 'next/image';

interface CommentsContentProps {
  comments: CommentThread[];
  isActive: boolean;
  speakers?: Array<{ display_as: string; member_id?: number }>;
}

// Helper function to get portrait URL
const getPortraitUrl = (memberId: string) => 
  `https://members-api.parliament.uk/api/Members/${memberId}/Portrait?croptype=oneone&webversion=true`;

// Helper function to normalize names for comparison
const normalizeName = (name: string | null | undefined): string => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    // Remove titles like Sir, Dame, Dr, etc.
    .replace(/^(sir|dame|dr|mr|mrs|ms|miss)\s+/i, '')
    // Remove special characters and extra spaces
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
};

// Helper function to find matching speaker
const findMatchingSpeaker = (
  author: string | null | undefined, 
  speakers?: Array<{ display_as: string; member_id: number; party: string }>
) => {
  if (!speakers?.length || !author) return undefined;
  
  const normalizedAuthor = normalizeName(author);
  if (!normalizedAuthor) return undefined;
  
  return speakers.find(speaker => 
    normalizeName(speaker.display_as) === normalizedAuthor
  );
};

export function CommentsContent({ comments, speakers }: CommentsContentProps) {
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
              !comment.author.party.includes("Labour") && "flex-row-reverse"
            )}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {comment.author.memberId ? (
                <div className="relative h-8 w-8 rounded-full overflow-hidden">
                  <Image
                    src={getPortraitUrl(comment.author.memberId)}
                    alt={comment.author.name}
                    fill
                    sizes="(max-width: 768px) 32px, 32px"
                    className="object-cover"
                    onError={(e) => {
                      // Fallback to UserIcon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="h-full w-full flex items-center justify-center ${
                          comment.author.party === "Conservative" 
                            ? "bg-blue-500/10" 
                            : "bg-muted"
                        }">
                          <svg class="h-5 w-5" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                      `;
                    }}
                  />
                </div>
              ) : (
                <User className={cn(
                  "h-8 w-8 p-1.5 rounded-full",
                  comment.author.party === "Conservative" 
                    ? "bg-blue-500/10" 
                    : "bg-muted"
                )} />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {comment.author.name}
                </span>
                {comment.author.party && (
                  <span className="text-xs text-muted-foreground">
                    {comment.author.party}
                  </span>
                )}
                {comment.author.constituency && (
                  <span className="text-xs text-muted-foreground">
                    ({comment.author.constituency})
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
                align={comment.author.party === "Conservative" ? "right" : "left"}
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
  upvotes_speakers: CommentSpeaker[];
  downvotes_speakers: CommentSpeaker[];
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