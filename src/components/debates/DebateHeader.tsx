import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";

interface Speaker {
  id: string;
  name: string;
  party?: string;
  constituency?: string;
}

interface DebateHeaderProps {
  title: string;
  date: string;
  speakers: Speaker[];
}

export function DebateHeader({ title, date, speakers }: DebateHeaderProps) {
  return (
    <div className="border-b p-4 bg-white">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <div className="text-sm text-gray-500 mb-4">
        {formatDate(date)}
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-2">
        {speakers.map((speaker) => (
          <div key={speaker.id} className="flex items-center gap-2 min-w-fit">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {speaker.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">{speaker.name}</div>
              {speaker.party && (
                <div className="text-xs text-gray-500">
                  {speaker.party}{speaker.constituency ? `, ${speaker.constituency}` : ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
