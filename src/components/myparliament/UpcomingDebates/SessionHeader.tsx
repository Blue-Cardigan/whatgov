import { Badge } from "@/components/ui/badge";
import { ProfileImage } from "./ProfileImage";
import type { OralQuestion } from "@/types/questions";

interface SessionHeaderProps {
  slot: {
    department: string;
    minister: OralQuestion['AnsweringMinister'];
    ministerTitle: string;
  };
  totalQuestions: number;
}

export function SessionHeader({ slot, totalQuestions }: SessionHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
      <div className="flex items-center gap-3">
        <ProfileImage
          src={slot.minister?.PhotoUrl}
          alt={slot.minister?.Name || 'Minister'}
          party={slot.minister?.Party}
          size={36}
        />
        <div>
          <h4 className="font-medium text-sm leading-tight">{slot.department}</h4>
          <p className="text-xs text-muted-foreground leading-tight">
            {slot.minister?.Name ? `${slot.minister.Name} - ` : ''}{slot.ministerTitle}
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="ml-auto">
        {totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}
      </Badge>
    </div>
  );
} 