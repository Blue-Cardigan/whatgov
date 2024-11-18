import { Division } from '@/types';
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { partyColours } from '@/lib/utils';
import { cn } from "@/lib/utils";
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface DivisionContentProps {
  division: Division;
  isActive: boolean;
}

type PartyVotes = Record<string, {
  ayes: number;
  noes: number;
  color: string;
}>;

function MPVoteIndicator({ 
  division, 
  mpId,
  mpName 
}: { 
  division: Division;
  mpId: number;
  mpName: string;
}) {
  const mpVoted = useMemo(() => {
    if (!mpId) return null;
    
    const votedAye = division.aye_members?.some(
      member => member.member_id === mpId
    );
    const votedNo = division.noe_members?.some(
      member => member.member_id === mpId
    );
    
    return votedAye ? 'aye' : votedNo ? 'no' : null;
  }, [division, mpId]);

  if (!mpId || !mpVoted) return null;

  const isAye = mpVoted === 'aye';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg p-4 flex items-center justify-between",
        "border-2 shadow-sm",
        isAye ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "rounded-full p-2",
          isAye ? "bg-emerald-500/10" : "bg-rose-500/10"
        )}>
          {isAye ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-rose-500" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Your MP voted {isAye ? 'Aye' : 'No'}</p>
          <p className="text-xs text-muted-foreground">{mpName}</p>
        </div>
      </div>
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs",
          isAye ? "border-emerald-500/20 bg-emerald-500/10" : "border-rose-500/20 bg-rose-500/10"
        )}
      >
        {isAye ? 'Supported' : 'Opposed'}
      </Badge>
    </motion.div>
  );
}

export function DivisionContent({ division, isActive }: DivisionContentProps) {
  const { profile } = useAuth();
  // Memoize vote calculations
  const { 
    partyVotes 
  } = useMemo(() => {
    const total = division.ayes_count + division.noes_count;
    const partyVotesMap: PartyVotes = {};
    
    // Process votes in a single pass
    [...(division.aye_members || []), ...(division.noe_members || [])].forEach(member => {
      if (!partyVotesMap[member.party]) {
        partyVotesMap[member.party] = {
          ayes: 0,
          noes: 0,
          color: partyColours[member.party]?.color || '#A9A9A9'
        };
      }
      const isAye = division.aye_members?.includes(member);
      partyVotesMap[member.party][isAye ? 'ayes' : 'noes']++;
    });

    return {
      totalVotes: total,
      ayePercentage: Math.round((division.ayes_count / total) * 100),
      noePercentage: Math.round((division.noes_count / total) * 100),
      partyVotes: partyVotesMap
    };
  }, [division]);

  return (
    <CardContent>
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: isActive ? 1 : 0.5, 
          y: isActive ? 0 : 10 
        }}
        transition={{ duration: 0.3 }}
      >
        <DivisionHeader division={division} />
        {profile?.mp_id && profile?.mp && (
          <MPVoteIndicator 
            division={division} 
            mpId={profile.mp_id}
            mpName={profile.mp}
          />
        )}
        <QuestionContext division={division} />
        <VoteSection 
          type="aye"
          count={division.ayes_count}
          partyVotes={partyVotes}
          argument={division.ai_key_arguments?.for}
        />
        <VoteSection 
          type="no"
          count={division.noes_count}
          partyVotes={partyVotes}
          argument={division.ai_key_arguments?.against}
        />
        <PartyLegend partyVotes={partyVotes} />
      </motion.div>
    </CardContent>
  );
}

function DivisionHeader({ division }: { division: Division }) {
  const formattedTime = useMemo(() => {
    if (!division.time || division.time === '00:00:00') return null;
    // Convert HH:MM:SS to HH:MM format
    return division.time.slice(0, 5);
  }, [division.time]);

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">
          Division {division.division_number}
        </h3>
        {formattedTime && (
          <div className="text-xs text-muted-foreground">
            {formattedTime}
          </div>
        )}
      </div>
      <Badge variant="outline" className="text-xs">
        {division.ai_topic}
      </Badge>
    </div>
  );
}

function QuestionContext({ division }: { division: Division }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {division.ai_question}
      </p>
      {division.ai_context && (
        <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3">
          {division.ai_context}
        </p>
      )}
    </div>
  );
}

function VoteSection({ 
  type, 
  count, 
  partyVotes, 
  argument 
}: { 
  type: 'aye' | 'no';
  count: number;
  partyVotes: PartyVotes;
  argument?: string;
}) {
  const isAye = type === 'aye';
  const Icon = isAye ? CheckCircle2 : XCircle;
  const colorClass = isAye ? 'text-emerald-500' : 'text-rose-500';
  const bgClass = isAye ? 'bg-emerald-500/10 dark:bg-emerald-500/5' : 'bg-rose-500/10 dark:bg-rose-500/5';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium">
        <Icon className={cn("h-3 w-3", colorClass)} />
        <span>{isAye ? 'Aye' : 'No'} ({count})</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Object.entries(partyVotes).map(([party, votes]) => {
          const voteCount = isAye ? votes.ayes : votes.noes;
          return voteCount > 0 ? (
            <div key={`${type}-${party}`} className="flex flex-wrap gap-1">
              {Array.from({ length: voteCount }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: votes.color }}
                  title={`${party}: ${voteCount} votes`}
                />
              ))}
            </div>
          ) : null;
        })}
      </div>
      {argument && (
        <div className={cn("text-xs p-2 rounded-md", bgClass)}>
          <p className="text-muted-foreground">{argument}</p>
        </div>
      )}
    </div>
  );
}

function PartyLegend({ partyVotes }: { partyVotes: PartyVotes }) {
  return (
    <div className="pt-2 border-t">
      <div className="flex items-center gap-2 text-xs font-medium mb-2">
        <Users className="h-3 w-3" />
        <span>Parties</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(partyVotes).map(([party, votes]) => (
          <div key={party} className="flex items-center gap-1 text-xs">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: votes.color }}
            />
            <span>{party} ({votes.ayes + votes.noes})</span>
          </div>
        ))}
      </div>
    </div>
  );
} 