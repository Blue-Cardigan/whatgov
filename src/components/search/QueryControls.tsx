import { Button } from "../ui/button";

interface QueryControlsProps {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onAddPart: (type: 'text' | 'spokenby' | 'debate' | 'words') => void;
  house: 'Commons' | 'Lords';
  onHouseChange: (house: 'Commons' | 'Lords') => void;
}

export function QueryControls({
  showAdvanced,
  onToggleAdvanced,
  onAddPart,
  house,
  onHouseChange
}: QueryControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleAdvanced}
          className="text-xs"
        >
          {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
        </Button>

        {/* House Toggle */}
        <div className="flex items-center gap-2 ml-2 border-l pl-2">
          <span className="text-sm text-muted-foreground">House:</span>
          <div className="flex gap-1">
            <Button
              variant={house === 'Commons' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onHouseChange('Commons')}
            >
              Commons
            </Button>
            <Button
              variant={house === 'Lords' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onHouseChange('Lords')}
            >
              Lords
            </Button>
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPart('spokenby')}
          >
            Add Speaker
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPart('debate')}
          >
            Add Debate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPart('words')}
          >
            Add Word Count
          </Button>
        </div>
      )}
    </div>
  );
} 