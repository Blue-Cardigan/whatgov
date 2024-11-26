import { useAuth } from "@/hooks/useAuth";
import { SignInPrompt } from "@/components/ui/sign-in-prompt";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

function DashboardLoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Menu Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <Card className="p-6">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function AuthenticatedRoute({ children }: AuthenticatedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  if (!user) {
    return (
      <SignInPrompt
        title="Sign in to access your dashboard"
        description="Track your MP's activity, and voting patterns of the UK and your constituency"
      />
    );
  }

  return <>{children}</>;
} 