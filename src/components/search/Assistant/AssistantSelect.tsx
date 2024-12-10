import { useEffect, useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserCog, PencilIcon } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AssistantBuilder } from './AssistantBuilder';

interface Assistant {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  openai_assistant_id: string;
}

interface AssistantSelectProps {
  onAssistantChange: (assistantId: string | null, openaiAssistantId: string | null) => void;
}

export function AssistantSelect({ onAssistantChange }: AssistantSelectProps) {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAssistant, setEditingAssistant] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('default');
  const supabase = useSupabase();
  const { user, isPremium } = useAuth();

  const fetchAssistants = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('id, name, description, status, openai_assistant_id')
        .eq('user_id', user.id)
        .in('status', ['ready', 'pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssistants(data || []);
    } catch (error) {
      console.error('Error fetching assistants:', error);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchAssistants();
  }, [user, supabase, fetchAssistants]);

  useEffect(() => {
    // Reset to default assistant if the currently selected assistant is deleted
    if (selectedAssistantId !== 'default' && assistants.length > 0) {
      const assistantExists = assistants.some(a => a.id === selectedAssistantId);
      if (!assistantExists) {
        setSelectedAssistantId('default');
        onAssistantChange(null, null);
      }
    }
  }, [assistants, selectedAssistantId, onAssistantChange]);

  const handleEditClose = async (shouldRefresh: boolean = true) => {
    setIsEditDialogOpen(false);
    setEditingAssistant(null);
    
    if (shouldRefresh) {
      setLoading(true);
      await fetchAssistants();
      // Maintain the selected assistant after refresh
      if (selectedAssistantId !== 'default') {
        const updatedAssistant = (await supabase
          .from('assistants')
          .select('id, openai_assistant_id')
          .eq('id', selectedAssistantId)
          .single()
        ).data;

        if (updatedAssistant) {
          onAssistantChange(
            updatedAssistant.id,
            updatedAssistant.openai_assistant_id
          );
        }
      }
    }
  };

  if (!isPremium) {
    return null;
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading assistants...</span>
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  if (assistants.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            <span>No assistants available</span>
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <div className="flex gap-2">
      <Select 
        value={selectedAssistantId}
        onValueChange={(value) => {
          setSelectedAssistantId(value);
          if (value === 'default') {
            onAssistantChange(null, null);
            return;
          }

          const selectedAssistant = assistants.find(a => a.id === value);
          if (selectedAssistant) {
            onAssistantChange(
              selectedAssistant.id,
              selectedAssistant.openai_assistant_id
            );
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span>Select an assistant...</span>
            </div>
          } />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span>Default Assistant</span>
            </div>
          </SelectItem>
          {assistants.map((assistant) => (
            <SelectItem 
              key={assistant.id} 
              value={assistant.id}
              disabled={assistant.status !== 'ready'}
            >
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 shrink-0" />
                <span className="truncate">{assistant.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const selectedAssistant = assistants.find(a => 
                  a.id === selectedAssistantId
                );
                if (selectedAssistant?.status === 'ready') {
                  setEditingAssistant(selectedAssistant.id);
                  setIsEditDialogOpen(true);
                }
              }}
              disabled={selectedAssistantId === 'default'}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {selectedAssistantId === 'default' 
              ? 'The default assistant cannot be edited' 
              : 'Edit assistant'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {editingAssistant && (
        <AssistantBuilder
          isOpen={isEditDialogOpen}
          setIsOpen={(open) => {
            if (!open) {
              handleEditClose(true);
            }
          }}
          mode="edit"
          assistantId={editingAssistant}
          onAssistantCreate={async () => {
            // This won't be called in edit mode
          }}
          onAssistantChange={onAssistantChange}
        />
      )}
    </div>
  );
} 