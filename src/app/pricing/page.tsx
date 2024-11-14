import { PricingTiers } from '@/components/pricing/PricingTiers';

export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Choose Your Level of Parliamentary Engagement
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          From casual observation to professional research, we have a plan that matches your needs
        </p>
      </div>
      <PricingTiers />
    </div>
  );
} 