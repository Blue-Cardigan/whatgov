import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
  const supabase = useSupabase();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchAssistants() {
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
    }

    fetchAssistants();
  }, [user, supabase]);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading assistants..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (assistants.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="No assistants available" />
        </SelectTrigger>
      </Select>
    );
  }

  const getStatusIndicator = (status: Assistant['status']) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-3 w-3 animate-spin inline-block ml-2" />;
      case 'failed':
        return <span className="text-destructive ml-2">⚠️</span>;
      default:
        return null;
    }
  };

  const handleAssistantChange = (value: string) => {
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
  };

  return (
    <Select onValueChange={handleAssistantChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select an assistant..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Default Assistant</SelectItem>
        {assistants.map((assistant) => (
          <SelectItem 
            key={assistant.id} 
            value={assistant.id}
            disabled={assistant.status !== 'ready'}
            className="flex items-center justify-between"
          >
            <span className="flex items-center">
              {assistant.name}
              {getStatusIndicator(assistant.status)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 