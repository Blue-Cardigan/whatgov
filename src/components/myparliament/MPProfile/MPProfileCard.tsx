import Image from "next/image";
import type { MPData } from "@/types";
import { partyColours } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MapPin, Calendar, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MPProfileCardProps {
  mpData: MPData;
}

interface ProfileDetailProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
}

function ProfileDetail({ icon, label, value }: ProfileDetailProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 sm:items-center">
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="font-medium text-muted-foreground">{label}:</span>
      </div>
      <span className="ml-6 sm:ml-0">{value}</span>
    </div>
  );
}

const MINISTERIAL_RANKINGS = {
  "Cabinet": "Most senior level of government, comprising the Prime Minister and senior ministers",
  "Minister of State": "Senior ministers below cabinet level",
  "Parliamentary Under-Secretary": "Junior ministerial position",
  "Lords Minister": "Minister in the House of Lords",
} as const;

type MinisterialRank = keyof typeof MINISTERIAL_RANKINGS;

function MinisterialBadge({ rank }: { rank: string }) {
  const getRankStyle = (rank: string) => {
    switch(rank) {
      case 'Cabinet':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
      case 'Minister of State':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      case 'Parliamentary Under-Secretary':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'Lords Minister':
        return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${getRankStyle(rank)} cursor-help touch-action-none`}
            role="button"
            tabIndex={0}
          >
            {rank}
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="center"
          sideOffset={5}
          className="max-w-[280px] text-sm text-center"
        >
          <p>{MINISTERIAL_RANKINGS[rank as MinisterialRank] || 'Your MP is in the Cabinet. This is their place in the "pecking order"'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MPProfileCard({ mpData }: MPProfileCardProps) {
  const getPartyBadgeStyle = (party: string) => {
    const partyColor = partyColours[party]?.color || '#808080';
    return {
      backgroundColor: `${partyColor}15`,
      color: partyColor,
      borderColor: `${partyColor}30`,
    };
  };

  return (
    <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
      {/* Image Section - improved mobile sizing */}
      <div className="relative mx-auto sm:mx-0 w-40 sm:w-36 h-52 sm:h-48 shrink-0">
        {mpData.twfy_image_url ? (
          <div className="relative w-full h-full">
            <Image
              src={mpData.twfy_image_url}
              alt={mpData.display_as}
              fill
              className="object-cover rounded-xl shadow-md"
              priority
              sizes="144px"
              quality={100}
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10" />
          </div>
        ) : (
          <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center border">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Details Section - better spacing */}
      <div className="flex-1 space-y-4">
        {/* Header - improved spacing */}
        <div className="space-y-2.5 text-center sm:text-left">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{mpData.display_as}</h2>
              {mpData.ministerial_ranking && (
                <MinisterialBadge rank={mpData.ministerial_ranking.toString()} />
              )}
            </div>
            <p className="text-base sm:text-lg text-muted-foreground">{mpData.full_title}</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
            <Badge 
              variant="outline" 
              style={getPartyBadgeStyle(mpData.party)}
            >
              {mpData.party}
            </Badge>
            {mpData.department && (
              <span className="text-sm text-muted-foreground">
                {mpData.department}
              </span>
            )}
          </div>
        </div>

        {/* Main Details - improved spacing */}
        <div className="space-y-3 pt-3 border-t">
          <ProfileDetail
            icon={<MapPin className="h-4 w-4" />}
            label="Constituency"
            value={
              <span className="break-words">
                {mpData.constituency}
                {mpData.constituency_country && 
                  <span className="text-sm text-muted-foreground block sm:inline sm:ml-2">
                    ({mpData.constituency_country})
                  </span>
                }
              </span>
            }
          />
          
          <ProfileDetail
            icon={<Calendar className="h-4 w-4" />}
            label="Member since"
            value={format(new Date(mpData.house_start_date), 'dd MMMM yyyy')}
          />

          {mpData.age && (
            <ProfileDetail
              icon={<User className="h-4 w-4" />}
              label="Age"
              value={mpData.age.toString()}
            />
          )}
        </div>
      </div>
    </div>
  );
} 