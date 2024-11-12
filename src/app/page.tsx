import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="container px-4 py-16 mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Parliamentary Debates AI Assistant
        </h1>
        
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Explore parliamentary debates with AI-powered insights and analysis.
          Search through historical records and get instant summaries.
        </p>
        
        <div className="mt-10 flex items-center justify-center gap-6">
          <Link href="/debates">
            <Button size="lg">
              Browse Debates
            </Button>
          </Link>
          
          <Link href="/about">
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
