import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
  
  interface AssistantConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    name: string;
    description: string;
    filterDescription: string;
    debateCount: number | null;
    isCountLoading: boolean;
  }
  
  export function AssistantConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    name,
    description,
    filterDescription,
    debateCount,
    isCountLoading,
  }: AssistantConfirmationDialogProps) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Assistant Creation</AlertDialogTitle>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <span className="font-semibold">Name:</span>
                  <p className="mt-1">{name}</p>
                </div>
                
                {description && (
                  <div>
                    <span className="font-semibold">Description:</span>
                    <p className="mt-1">{description}</p>
                  </div>
                )}
  
                <div>
                  <span className="font-semibold">Included Debates:</span>
                  <p className="mt-1">{filterDescription}</p>
                </div>
  
                <div>
                  <span className="font-semibold">Number of Debates:</span>
                  <p className="mt-1">
                    {isCountLoading ? (
                      <span className="text-muted-foreground">Counting debates...</span>
                    ) : debateCount !== null ? (
                      <span className="text-primary font-medium">
                        {debateCount.toLocaleString()} debate{debateCount !== 1 ? 's' : ''} will be included
                      </span>
                    ) : (
                      <span className="text-destructive">Failed to count debates</span>
                    )}
                  </p>
                </div>
              </div>
  
              <AlertDialogDescription className="text-sm text-muted-foreground">
                This will create an AI assistant with access to the specified parliamentary debates. 
                The assistant will be able to analyze and reference these debates when answering questions.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onOpenChange(false)}>
              Back to Editor
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              disabled={isCountLoading || debateCount === 0}
            >
              {debateCount === 0 ? (
                "No Matching Debates"
              ) : (
                "Create Assistant"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }