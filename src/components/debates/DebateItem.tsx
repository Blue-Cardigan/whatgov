import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DebateItemProps {
    item: any;
    generatedContent?: any;
  }
  
  export function DebateItem({ item, generatedContent }: DebateItemProps) {
    const [showGenerated, setShowGenerated] = useState(false);
  
    return (
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium">{item.AttributedTo}</h3>
            <span className="text-sm text-gray-500">
              {new Date(item.Timecode).toLocaleTimeString()}
            </span>
          </div>
          {generatedContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGenerated(!showGenerated)}
            >
              {showGenerated ? 'Show Original' : 'Show Generated'}
            </Button>
          )}
        </div>
  
        <div className="prose max-w-none">
          {showGenerated ? generatedContent?.content : item.Value}
        </div>
      </div>
    );
  }