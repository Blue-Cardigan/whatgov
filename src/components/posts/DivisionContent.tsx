import { Division } from '@/types';
import { CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { partyColours } from '@/lib/utils';
import { cn } from "@/lib/utils";
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DivisionContentProps {
  division: Division;
  isActive: boolean;
}

type PartyVotes = Record<string, {
  ayes: number;
  noes: number;
  color: string;
}>;

export function DivisionContent({ division, isActive }: DivisionContentProps) {
  const { profile } = useAuth();
  const { partyVotes } = useMemo(() => {
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
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: isActive ? 1 : 0.5, 
          y: isActive ? 0 : 10,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Division {division.division_number}
              </span>
              {division.time && division.time !== '00:00:00' && (
                <span className="text-xs text-muted-foreground">
                  {division.time.slice(0, 5)}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {division.ai_question}
          </p>
        </div>

        {profile?.mp_id && profile?.mp && (
          <MPVoteIndicator 
            division={division} 
            mpId={profile.mp_id}
            mpName={profile.mp}
          />
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-medium">
                Aye ({division.ayes_count})
              </span>
            </div>
            <div className="space-y-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full text-left">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(partyVotes)
                        .filter(([, votes]) => votes.ayes > 0)
                        .sort((a, b) => b[1].ayes - a[1].ayes)
                        .slice(0, 3) // Show only top 3 parties
                        .map(([party, votes]) => (
                          <div 
                            key={`aye-${party}`}
                            className="flex items-center gap-1"
                          >
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: votes.color }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {votes.ayes}
                            </span>
                          </div>
                        ))}
                      {Object.entries(partyVotes).filter(([, votes]) => votes.ayes > 0).length > 3 && (
                        <span className="text-xs text-muted-foreground">+{
                          Object.entries(partyVotes).filter(([, votes]) => votes.ayes > 0).length - 3
                        } more</span>
                      )}
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Aye Votes by Party</h4>
                    <div className="space-y-1.5">
                      {Object.entries(partyVotes)
                        .filter(([, votes]) => votes.ayes > 0)
                        .sort((a, b) => b[1].ayes - a[1].ayes)
                        .map(([party, votes]) => (
                          <div 
                            key={`aye-${party}`}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: votes.color }}
                              />
                              <span className="text-sm">{party}</span>
                            </div>
                            <span className="text-sm font-medium">
                              {votes.ayes}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {division.ai_key_arguments?.for && (
                <p className="text-xs text-muted-foreground bg-emerald-500/5 p-2 rounded-md">
                  {division.ai_key_arguments.for}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-xs font-medium">
                Noe ({division.noes_count})
              </span>
            </div>
            <div className="space-y-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full text-left">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(partyVotes)
                        .filter(([, votes]) => votes.noes > 0)
                        .sort((a, b) => b[1].noes - a[1].noes)
                        .slice(0, 3) // Show only top 3 parties
                        .map(([party, votes]) => (
                          <div 
                            key={`noe-${party}`}
                            className="flex items-center gap-1"
                          >
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: votes.color }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {votes.noes}
                            </span>
                          </div>
                        ))}
                      {Object.entries(partyVotes).filter(([, votes]) => votes.noes > 0).length > 3 && (
                        <span className="text-xs text-muted-foreground">+{
                          Object.entries(partyVotes).filter(([, votes]) => votes.noes > 0).length - 3
                        } more</span>
                      )}
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Noe Votes by Party</h4>
                    <div className="space-y-1.5">
                      {Object.entries(partyVotes)
                        .filter(([, votes]) => votes.noes > 0)
                        .sort((a, b) => b[1].noes - a[1].noes)
                        .map(([party, votes]) => (
                          <div 
                            key={`noe-${party}`}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: votes.color }}
                              />
                              <span className="text-sm">{party}</span>
                            </div>
                            <span className="text-sm font-medium">
                              {votes.noes}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {division.ai_key_arguments?.against && (
                <p className="text-xs text-muted-foreground bg-rose-500/5 p-2 rounded-md">
                  {division.ai_key_arguments.against}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </CardContent>
  );
}

function MPVoteIndicator({ division, mpId, mpName }: { 
  division: Division;
  mpId: number;
  mpName: string;
}) {
  const mpVoted = useMemo(() => {
    if (!mpId) return null;
    const votedAye = division.aye_members?.some(m => m.member_id === mpId);
    const votedNoe = division.noe_members?.some(m => m.member_id === mpId);
    return votedAye ? 'aye' : votedNoe ? 'noe' : null;
  }, [division, mpId]);

  if (!mpId || !mpVoted) return null;
  const isAye = mpVoted === 'aye';
  
  return (
    <div className={cn(
      "rounded-lg p-2 flex items-center justify-between",
      "border shadow-sm",
      isAye ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
    )}>
      <div className="flex items-center gap-2">
        {isAye ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-rose-500" />
        )}
        <div>
          <p className="text-xs font-medium">Your MP voted {isAye ? 'Aye' : 'Noe'}</p>
          <p className="text-xs text-muted-foreground">{mpName}</p>
        </div>
      </div>
    </div>
  );
} 