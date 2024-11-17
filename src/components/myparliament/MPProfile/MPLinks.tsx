import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, Facebook, Twitter } from "lucide-react";
import type { MPData } from "@/lib/supabase";

interface MPLinksProps {
  mpData: MPData;
}

export function MPLinks({ mpData }: MPLinksProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button 
        variant="default"
        className="flex items-center gap-2"
        onClick={() => window.open(`https://members.parliament.uk/member/${mpData.member_id}`, '_blank')}
      >
        View on Parliament.uk
        <ExternalLink className="h-4 w-4" />
      </Button>
      
      {mpData.email && (
        <Button 
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => window.location.href = `mailto:${mpData.email}`}
        >
          Contact via Email
          <Mail className="h-4 w-4" />
        </Button>
      )}

      <div className="flex gap-2">
        {mpData.media?.twitter && (
          <Button 
            variant="outline"
            size="icon"
            onClick={() => window.open(mpData.media?.twitter!, '_blank')}
            title="Twitter Profile"
          >
            <Twitter className="h-4 w-4" />
          </Button>
        )}

        {mpData.media?.facebook && (
          <Button 
            variant="outline"
            size="icon"
            onClick={() => window.open(mpData.media?.facebook!, '_blank')}
            title="Facebook Profile"
          >
            <Facebook className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 