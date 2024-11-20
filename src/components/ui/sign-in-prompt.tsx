import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn } from 'lucide-react';
import { useRouter } from "next/navigation";

interface SignInPromptProps {
  title: string;
  description: string;
  className?: string;
}

export function SignInPrompt({ title, description, className }: SignInPromptProps) {
  const router = useRouter();

  return (
    <Card className={className || "p-6"}>
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="rounded-full bg-muted p-3">
          <LogIn className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-2 text-center">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {description}
          </p>
        </div>
        <Button 
          onClick={() => router.push('/login')}
          className="mt-2"
        >
          Sign in
        </Button>
      </div>
    </Card>
  );
} 