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
    <div className="flex items-center gap-4 text-sm">
      {/* House Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">House:</span>
        <div className="flex gap-1">
          <Button
            variant={house === 'Commons' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => onHouseChange('Commons')}
          >
            Commons
          </Button>
          <Button
            variant={house === 'Lords' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => onHouseChange('Lords')}
          >
            Lords
          </Button>
        </div>
      </div>

      <Button
        variant="link"
        size="sm"
        onClick={onToggleAdvanced}
        className="text-muted-foreground hover:text-foreground"
      >
        {showAdvanced ? '← Basic Search' : 'Advanced Search →'}
      </Button>

      {showAdvanced && (
        <div className="flex gap-2">
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
        </div>
      )}
    </div>
  );
} 