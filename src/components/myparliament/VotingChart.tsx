import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { SignInPrompt } from "@/components/ui/sign-in-prompt";
import { useAuth } from "@/hooks/useAuth";

interface ChartData {
  timestamp: string;
  Ayes: number;
  Noes: number;
}

export function VotingChart({ data, timeframe }: { 
  data: ChartData[]; 
  timeframe: 'daily' | 'weekly' | 'all';
}) {

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    switch (timeframe) {
      case 'daily':
        return format(date, 'HH:mm');
      case 'weekly':
        return format(date, 'EEE d');
      case 'all':
        return format(date, 'MMM d, yyyy');
    }
  };

  const CustomTooltip = ({ 
    active, 
    payload, 
    label 
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-1">{formatDate(label as string)}</p>
          {payload.map((entry) => (
            <div 
              key={entry.name} 
              className="flex items-center gap-2 text-sm"
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}: {entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="timestamp"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
            tickMargin={10}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickMargin={10}
            allowDecimals={false}
          />
          <Tooltip 
            content={<CustomTooltip />}
          />
          <Legend 
            verticalAlign="top"
            height={36}
          />
          <Line
            name="Aye Votes"
            type="monotone"
            dataKey="Ayes"
            stroke="#10b981"
            strokeWidth={2}
            dot={timeframe === 'all'}
            activeDot={{ r: 6 }}
          />
          <Line
            name="No Votes"
            type="monotone"
            dataKey="Noes"
            stroke="#e11d48"
            strokeWidth={2}
            dot={timeframe === 'all'}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 