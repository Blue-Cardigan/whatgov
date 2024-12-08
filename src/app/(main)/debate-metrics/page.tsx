import DebateAnalysisDashboard from '@/components/myparliament/DebateAnalytics'

export const metadata = {
  title: 'Debate Analytics | MyParliament',
  description: 'Analytics and insights about parliamentary debates',
}

export default function DebateAnalyticsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Debate Analytics</h1>
      <DebateAnalysisDashboard />
    </div>
  )
}