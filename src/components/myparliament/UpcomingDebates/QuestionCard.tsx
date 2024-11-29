import { OralQuestion } from "@/lib/search-api";
import { ProfileImage } from "./ProfileImage";

interface QuestionCardProps {
  question: {
    text: string;
    askingMembers: OralQuestion['AskingMember'][];
  };
  index: number;
}

export function QuestionCard({ question, index }: QuestionCardProps) {
  return (
    <div className="p-4 bg-card rounded-lg border space-y-3">
      <div className="flex items-start gap-3">
        <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-muted text-xs font-medium">
          {index + 1}
        </div>
        <p className="text-sm leading-6">{question.text}</p>
      </div>
      <div className="flex flex-wrap gap-2 pl-9">
        {question.askingMembers.map((member, mIndex) => (
          <div 
            key={`${member.Name}-${mIndex}`}
            className="flex items-center gap-1.5 bg-muted/50 hover:bg-muted transition-colors rounded-full pl-1 pr-2.5 py-0.5"
          >
            <ProfileImage
              src={member.PhotoUrl}
              alt={member.Name}
              party={member.Party}
              size={20}
              fallbackClassName="bg-transparent"
            />
            <span className="text-xs font-medium">{member.Name}</span>
            <span className="text-xs text-muted-foreground">({member.Party})</span>
          </div>
        ))}
      </div>
    </div>
  );
} 