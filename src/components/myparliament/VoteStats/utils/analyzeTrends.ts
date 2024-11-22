interface VoteDataPoint {
  timestamp: string;
  Ayes: number;
  Noes: number;
}

interface Trend {
  direction: 'up' | 'down' | 'stable';
  description: string;
}

export function analyzeTrends(data: VoteDataPoint[], timeframe: string): Trend[] {
  if (data.length < 2) {
    return [{
      direction: 'stable',
      description: 'Not enough data to analyze trends'
    }];
  }

  const trends: Trend[] = [];
  
  // Calculate period-over-period changes
  const periodsToCompare = timeframe === 'week' ? 7 : timeframe === 'month' ? 4 : 12;
  const periodSize = Math.max(1, Math.floor(data.length / periodsToCompare));
  
  const recentData = data.slice(-periodSize);
  const previousData = data.slice(-periodSize * 2, -periodSize);
  
  // Calculate voting velocity (rate of change)
  const recentVelocity = recentData.reduce((acc, point, i) => {
    const prev = i > 0 ? recentData[i - 1] : previousData[previousData.length - 1];
    return acc + ((point.Ayes + point.Noes) - (prev?.Ayes + prev?.Noes || 0));
  }, 0) / periodSize;

  // Analyze voting patterns
  const recentAyeRate = recentData.reduce((acc, point) => 
    acc + (point.Ayes / (point.Ayes + point.Noes)), 0) / recentData.length;
  const previousAyeRate = previousData.length ? previousData.reduce((acc, point) => 
    acc + (point.Ayes / (point.Ayes + point.Noes)), 0) / previousData.length : recentAyeRate;

  // Add overall activity trend
  const totalVotes = data[data.length - 1].Ayes + data[data.length - 1].Noes;
  const periodLabel = timeframe === 'week' ? 'this week' : 
                     timeframe === 'month' ? 'this month' : 
                     timeframe === 'year' ? 'this year' : 'overall';
  
  trends.push({
    direction: 'stable',
    description: `Total of ${totalVotes} votes ${periodLabel}`
  });

  // Add velocity-based trend
  if (Math.abs(recentVelocity) > 2) {
    const periodUnit = timeframe === 'week' ? 'day' : 'week';
    trends.push({
      direction: recentVelocity > 0 ? 'up' : 'down',
      description: `${recentVelocity > 0 ? 'Increased' : 'Decreased'} activity: ${Math.abs(Math.round(recentVelocity))} votes per ${periodUnit}`
    });
  }

  // Add agreement pattern trend
  const ayeRateChange = recentAyeRate - previousAyeRate;
  if (Math.abs(ayeRateChange) > 0.1) {
    trends.push({
      direction: ayeRateChange > 0 ? 'up' : 'down',
      description: `${Math.round(Math.abs(ayeRateChange) * 100)}% ${ayeRateChange > 0 ? 'higher' : 'lower'} agreement rate than previous ${timeframe}`
    });
  }

  // Analyze voting consistency
  const recentVariability = calculateVariability(recentData);
  const previousVariability = calculateVariability(previousData);
  
  if (Math.abs(recentVariability - previousVariability) > 0.2) {
    trends.push({
      direction: recentVariability < previousVariability ? 'stable' : 'down',
      description: recentVariability < previousVariability 
        ? 'More consistent voting pattern emerging'
        : 'Voting pattern shows increased variation'
    });
  }

  return trends;
}

function calculateVariability(data: VoteDataPoint[]): number {
  if (data.length < 2) return 0;
  
  const votesPerPeriod = data.map((point, i) => {
    const prev = data[i - 1];
    return prev ? (point.Ayes + point.Noes) - (prev.Ayes + prev.Noes) : 0;
  }).slice(1);

  const mean = votesPerPeriod.reduce((a, b) => a + b, 0) / votesPerPeriod.length;
  const variance = votesPerPeriod.reduce((acc, val) => 
    acc + Math.pow(val - mean, 2), 0) / votesPerPeriod.length;
    
  return Math.sqrt(variance) / Math.abs(mean || 1);
} 