import { useState } from "react";
import { TopicStatsEntry } from "@/types/VoteStats";
import { AiTopic } from "@/types";
import { TOPICS } from "@/lib/utils";
import { TrendingUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopicStatCardProps {
  topic: AiTopic;
  stats: TopicStatsEntry;
  showTopQuestions?: boolean;
  showVoteHistory?: boolean;
  isUserVotes?: boolean;
}

export function TopicStatCard({ 
  topic, 
  stats, 
  showVoteHistory = false,
  isUserVotes = false 
}: TopicStatCardProps) {
  const aye_votes = Number(stats.aye_votes) || 0;
  const no_votes = Number(stats.no_votes) || 0;
  const totalVotes = aye_votes + no_votes;
  const ayePercentage = totalVotes > 0 ? (aye_votes / totalVotes) * 100 : 0;
  
  const topicInfo = TOPICS.find(t => t.label === topic.name);
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="space-y-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      {/* Topic Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {topicInfo?.icon && (
              <topicInfo.icon className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="font-medium">{topic.name}</div>
          </div>
          <div className="text-sm text-muted-foreground">
            {totalVotes.toLocaleString()} {isUserVotes ? 'of your votes' : 'total votes'}
          </div>
        </div>

        {/* Speakers */}
        {topic.speakers.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Key speakers: {topic.speakers.slice(0, 2).join(', ')}
            {topic.speakers.length > 2 && ' and others'}
          </div>
        )}
        
        {/* Subtopics */}
        {topic.subtopics.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {topic.subtopics.slice(0, 2).join(', ')}
            {topic.subtopics.length > 2 && '...'}
          </div>
        )}
        
        {/* Vote Distribution - Updated */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {isUserVotes ? 'Your Votes' : 'Overall Votes'}
            </div>
            <div className="text-sm text-muted-foreground">
              {totalVotes.toLocaleString()} {isUserVotes ? 'votes by you' : 'votes cast'}
            </div>
          </div>

          {totalVotes > 0 ? (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-emerald-600 font-medium">
                  {Math.round(ayePercentage)}% Ayes ({aye_votes.toLocaleString()})
                </span>
                <span className="text-rose-600 font-medium">
                  {Math.round(100 - ayePercentage)}% Noes ({no_votes.toLocaleString()})
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden bg-muted flex">
                <div 
                  className="bg-emerald-600/90 h-full transition-all duration-500 ease-out rounded-l-full"
                  style={{ width: `${ayePercentage}%` }}
                />
                <div 
                  className="bg-rose-600/90 h-full transition-all duration-500 ease-out rounded-r-full"
                  style={{ width: `${100 - ayePercentage}%` }}
                />
              </div>
              
              {/* Recent Questions - Updated */}
              {showVoteHistory && stats.vote_history ? (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium">Your Recent Votes</div>
                  {stats.vote_history.slice(0, 3).map((vote, i) => (
                    <div key={i} className="text-sm space-y-1">
                      <div className="text-muted-foreground">{vote.question}</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${vote.vote ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Voted {vote.vote ? 'Aye' : 'Noe'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(vote.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.top_questions && stats.top_questions.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {stats.top_questions.slice(0, 2).map((q, i) => (
                    <div key={i} className="text-sm space-y-1">
                      <div className="text-muted-foreground">{q.question}</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-medium">
                          {q.aye_votes.toLocaleString()} ayes
                        </span>
                        <span className="text-rose-600 font-medium">
                          {q.no_votes.toLocaleString()} noes
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              No votes recorded this month
            </div>
          )}
        </div>
      </div>

      {/* Show vote history if enabled */}
      {showVoteHistory && stats.vote_history && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Questions
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
          
          <div className={`space-y-4 pl-4 border-l-2 border-muted overflow-hidden transition-all duration-200 ease-in-out
            ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {stats.vote_history.slice(0, 5).map((vote, index) => (
              <div key={index} className="text-sm space-y-1">
                <div className="font-medium">{vote.question}</div>
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${vote.vote ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Voted {vote.vote ? 'Aye' : 'Noe'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(vote.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}