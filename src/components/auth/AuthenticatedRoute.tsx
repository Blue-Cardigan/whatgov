import { useAuth } from "@/contexts/AuthContext";
import { SignInPrompt } from "@/components/ui/sign-in-prompt";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";

interface AuthenticatedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
  fallback?: React.ReactNode;
  signInPrompt?: {
    title?: string;
    description?: string;
  };
}

export function AuthenticatedRoute({ 
  children, 
  requireProfile = true,
  fallback = <DashboardSkeleton />,
  signInPrompt
}: AuthenticatedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return fallback;
  }

  if (!user) {
    return (
      <SignInPrompt
        title={signInPrompt?.title || "Sign in required"}
        description={signInPrompt?.description || "Please sign in to access this content"}
      />
    );
  }

  if (requireProfile && !profile) {
    return fallback;
  }

  return <>{children}</>;
} 