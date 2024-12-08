'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import createClient from '@/lib/supabase/client';
import { Info } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricData {
  category: string;
  bin: string;
  frequency: number;
  percentage: number;
  rank_in_category: number;
}

interface SummaryStats {
  metric: string;
  min_value: number;
  max_value: number;
  avg_value: number;
  median_value: number;
  total_count: number;
}

const DebateAnalysisDashboard = () => {
  const [data, setData] = useState<MetricData[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const [metricsResponse, statsResponse] = await Promise.all([
          supabase.rpc('get_debate_metrics_extended'),
          supabase.rpc('get_debate_summary_stats')
        ]);

        if (metricsResponse.error) throw metricsResponse.error;
        if (statsResponse.error) throw statsResponse.error;

        setData(metricsResponse.data);
        setSummaryStats(statsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const ChartInfo = ({ content }: { content: string }) => (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger>
          <Info className="h-4 w-4 ml-2 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px] text-sm">
          <p>{content}</p>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );

  const StatCard = ({ title, stats }: { title: string, stats: SummaryStats }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Minimum</p>
            <p className="text-2xl font-bold">{stats.min_value.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Maximum</p>
            <p className="text-2xl font-bold">{stats.max_value.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Average</p>
            <p className="text-2xl font-bold">{stats.avg_value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Median</p>
            <p className="text-2xl font-bold">{stats.median_value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Calculate percentages for each category
  const calculatePercentages = (data: MetricData[]) => {
    const total = data.reduce((sum, item) => sum + item.frequency, 0);
    return data.map(item => ({
      ...item,
      percentage: Number(((item.frequency / total) * 100).toFixed(1))
    }));
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 p-4 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Debate Metrics Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create separate datasets for each category
  const wordLengthData = data.filter(d => d.category === "Search Text Length");
  const speakerData = data.filter(d => d.category === "Speaker Count");
  const contributionData = data.filter(d => d.category === "Contribution Count");
  const partyData = data.filter(d => d.category === "Party Frequency");

  // Create bubble chart data showing relationships
  const bubbleData = wordLengthData.map((item, idx) => ({
    wordLength: item.bin,
    speakers: speakerData[Math.min(idx, speakerData.length-1)].frequency,
    contributions: contributionData[Math.min(idx, contributionData.length-1)].frequency,
    size: item.frequency,
  }));

  // Define custom sort orders for bins
  const wordLengthOrder = [
    '0-50 words',
    '51-100 words',
    '101-250 words',
    '251-500 words',
    '501-1000 words',
    '1001-2500 words',
    '2501-5000 words',
    '5001-10000 words',
    '10000+ words'
  ];

  const speakerOrder = [
    '0 speakers',
    '1-2 speakers',
    '3-5 speakers',
    '6-8 speakers',
    '9-12 speakers',
    '13-16 speakers',
    '17-20 speakers',
    '21-25 speakers',
    '26+ speakers'
  ];

  const contributionOrder = [
    '0 contributions',
    '1-2 contributions',
    '3-5 contributions',
    '6-8 contributions',
    '9-12 contributions',
    '13-16 contributions',
    '17-20 contributions',
    '21-25 contributions',
    '26+ contributions'
  ];

  // Sort the data arrays
  const sortedWordLengthData = [...wordLengthData].sort((a, b) => 
    wordLengthOrder.indexOf(a.bin) - wordLengthOrder.indexOf(b.bin)
  );

  const sortedSpeakerData = [...speakerData].sort((a, b) => 
    speakerOrder.indexOf(a.bin) - speakerOrder.indexOf(b.bin)
  );

  const sortedContributionData = [...contributionData].sort((a, b) => 
    contributionOrder.indexOf(a.bin) - contributionOrder.indexOf(b.bin)
  );

  const sortedWordLengthDataWithPercentages = calculatePercentages(sortedWordLengthData);
  const sortedSpeakerDataWithPercentages = calculatePercentages(sortedSpeakerData);
  const sortedContributionDataWithPercentages = calculatePercentages(sortedContributionData);

  return (
    <div className="w-full space-y-6 p-4 max-w-7xl mx-auto">
      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        {summaryStats.map((stats) => (
          <StatCard 
            key={stats.metric}
            title={stats.metric}
            stats={stats}
          />
        ))}
      </div>

      {/* Distribution Comparison Chart */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center">
          <div>
            <CardTitle>Relative Distribution Comparison</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Proportional distribution of debates by different metrics
            </p>
          </div>
          <ChartInfo content="Shows the relative proportions of debates across different ranges for word count, speakers, and contributions. This allows for easy comparison of distributions between metrics." />
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  { name: 'Word Count', ...Object.fromEntries(sortedWordLengthDataWithPercentages.map(d => [d.bin, d.percentage])) },
                  { name: 'Speaker Count', ...Object.fromEntries(sortedSpeakerDataWithPercentages.map(d => [d.bin, d.percentage])) },
                  { name: 'Contribution Count', ...Object.fromEntries(sortedContributionDataWithPercentages.map(d => [d.bin, d.percentage])) }
                ]}
                margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#666" strokeOpacity={0.1} horizontal={false} />
                <XAxis type="number" unit="%" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Percentage']}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '6px' }}
                />
                <Legend />
                {wordLengthOrder.map((bin, index) => (
                  <Bar
                    key={bin}
                    dataKey={bin}
                    stackId="a"
                    fill={`hsl(${(index * 360) / wordLengthOrder.length}, 70%, 60%)`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div>
              <CardTitle>Word Length Distribution</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Analysis of debate lengths by word count
              </p>
            </div>
            <ChartInfo content="Shows how many debates fall into each word count range. This helps understand the typical length of parliamentary debates and identify patterns in debate size." />
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedWordLengthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#666" strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="bin" 
                    label={{ value: 'Word Count Range', position: 'bottom', offset: 0 }}
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    label={{ value: 'Number of Debates', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`${value} debates`, 'Frequency']}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '6px' }}
                  />
                  <Bar dataKey="frequency" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center">
            <div>
              <CardTitle>Speaker and Contribution Distribution</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Relationship between speakers, contributions, and debate size
              </p>
            </div>
            <ChartInfo content="This bubble chart shows the relationship between the number of speakers and contributions in debates. The size of each bubble represents the number of debates with those characteristics." />
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#666" strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="speakers" 
                    name="Speakers" 
                    label={{ value: 'Number of Speakers', position: 'bottom', offset: 20 }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    dataKey="contributions" 
                    name="Contributions"
                    label={{ value: 'Number of Contributions', angle: -90, position: 'insideLeft', offset: -10 }}
                    tick={{ fontSize: 12 }}
                  />
                  <ZAxis 
                    dataKey="size" 
                    range={[50, 400]} 
                    name="Word Length"
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => [`${value}`, name === 'Word Length' ? 'Debates' : name]}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '6px' }}
                  />
                  <Legend />
                  <Scatter 
                    name="Debate Metrics" 
                    data={bubbleData} 
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center">
            <div>
              <CardTitle>Party Distribution</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Frequency of party appearances in debates
              </p>
            </div>
            <ChartInfo content="Shows how often each political party appears in debates. This helps understand the relative participation levels of different parties in parliamentary discussions." />
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#666" strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="bin" 
                    label={{ value: 'Political Party', position: 'bottom', offset: 0 }}
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    label={{ value: 'Number of Appearances', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`${value} appearances`, 'Frequency']}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '6px' }}
                  />
                  <Bar dataKey="frequency" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebateAnalysisDashboard;