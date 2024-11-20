import { format } from 'date-fns';
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
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface VoteDataPoint {
  timestamp: string;
  Ayes: number;
  Noes: number;
}

interface VotingChartProps {
  data: VoteDataPoint[];
  timeframe: 'all' | 'year' | 'month' | 'week';
}

export function VotingChart({ data, timeframe }: VotingChartProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    switch (timeframe) {
      case 'week':
        return format(date, 'EEE ha');
      case 'month':
        return format(date, 'MMM d');
      case 'year':
        return format(date, 'MMM yyyy');
      default:
        return format(date, 'MMM d, yyyy');
    }
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const totalVotes = (payload[0].value as number) + (payload[1].value as number);
      return (
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{formatDate(label as string)}</p>
          {payload.map((entry) => {
            const percentage = totalVotes > 0 
              ? ((entry.value as number) / totalVotes * 100).toFixed(1)
              : '0';
            return (
              <div 
                key={entry.name}
                className="flex items-center gap-2 text-sm py-1"
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="flex-1">{entry.name}</span>
                <span className="font-medium">{entry.value}</span>
                <span className="text-muted-foreground text-xs">({percentage}%)</span>
              </div>
            );
          })}
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
          <XAxis 
            dataKey="timestamp"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickMargin={10}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            name="Aye Votes"
            type="monotone"
            dataKey="Ayes"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            name="No Votes"
            type="monotone"
            dataKey="Noes"
            stroke="#e11d48"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 