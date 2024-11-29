import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProfileImage } from "./ProfileImage";
import type { OralQuestion } from "@/types/questions";

interface DayHeaderProps {
  date: Date;
  sessionCount: number;
  questionCount: number;
  isExpanded: boolean;
  sessions: {
    department: string;
    minister: OralQuestion['AnsweringMinister'];
    questionCount: number;
  }[];
}

export function DayHeader({
  date,
  sessionCount,
  questionCount,
  isExpanded,
  sessions,
}: DayHeaderProps) {
  return (
    <div className="flex flex-col gap-2 p-4 hover:bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="uppercase">
            {format(date, 'EEEE')}
          </Badge>
          <span className="font-medium">
            {format(date, 'd MMMM')}
          </span>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {sessionCount} Session{sessionCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary">
              {questionCount} Question{questionCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          isExpanded && "rotate-180"
        )} />
      </div>

      {!isExpanded && sessions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {sessions.map((session, index) => (
            <div 
              key={`${session.department}-${index}`}
              className="flex items-center gap-2 bg-muted/30 rounded-lg p-2"
            >
              <ProfileImage
                src={session.minister?.PhotoUrl}
                alt={session.minister?.Name || 'Minister'}
                size={28}
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">
                  {session.department}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {session.minister?.Name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 