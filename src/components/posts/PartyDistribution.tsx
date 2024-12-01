import { useMemo } from "react";
import { partyColours } from "@/lib/utils";
import { PartyCount } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";
import { Users2 } from "lucide-react";

export function PartyDistribution({ partyCount }: { partyCount: PartyCount }) {
  const sortedParties = useMemo(() => {
    return Object.entries(partyCount)
      .sort(([, a], [, b]) => (b || 0) - (a || 0))
      .reduce((acc, [party, count]) => {
        const baseParty = party.split('(')[0].trim();
        if (!acc[baseParty]) {
          acc[baseParty] = { count: 0, color: partyColours[party]?.color || '#808080' };
        }
        acc[baseParty].count += count || 0;
        return acc;
      }, {} as Record<string, { count: number; color: string }>);
  }, [partyCount]);

  const totalCount = useMemo(() => 
    Object.values(sortedParties).reduce((sum, { count }) => sum + count, 0)
  , [sortedParties]);

  // Don't render if no speakers
  if (totalCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 ml-auto">
      <div className="flex items-center gap-1">
        <Users2 className="h-4 w-4" />
        <span className="text-xs font-medium">{totalCount}</span>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center hover:opacity-80 transition-opacity">
            {/* Party distribution bar */}
            <div className="flex h-2 w-full min-w-[4rem] max-w-24 rounded-full overflow-hidden">
              {Object.entries(sortedParties).map(([party, { count, color }]) => {
                const width = (count / totalCount) * 100;
                return (
                  <div
                    key={party}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ 
                      backgroundColor: color,
                      width: `${width}%`,
                    }}
                  />
                );
              })}
            </div>

            {/* Top 2 parties preview */}
            <div className="ml-2 hidden sm:flex items-center gap-2">
              {Object.entries(sortedParties).slice(0, 2).map(([party, { count, color }]) => (
                <div
                  key={party}
                  className="flex items-center gap-1"
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs">
                    {count}
                  </span>
                </div>
              ))}
              {Object.keys(sortedParties).length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{Object.keys(sortedParties).length - 2}
                </span>
              )}
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-64 bg-popover p-4 rounded-md shadow-md" align="start">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Speakers by Party</h4>
            <div className="space-y-1.5">
              {Object.entries(sortedParties).map(([party, { count, color }]) => {
                const percentage = ((count / totalCount) * 100).toFixed(1);
                return (
                  <div 
                    key={party}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm">{party}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}