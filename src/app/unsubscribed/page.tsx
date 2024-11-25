import { Button } from "@/components/ui/button";

import Link from "next/link";

export default function UnsubscribedPage() {
  return (
    <div className="container max-w-lg mx-auto py-16 px-4 text-center">
      <h1 className="text-2xl font-semibold mb-4">Successfully Unsubscribed</h1>
      <p className="text-muted-foreground mb-8">
        You&apos;ve been unsubscribed from our newsletter. You can always resubscribe from your profile settings.
      </p>
      <Link href="/accounts/profile">
        <Button variant="outline">Go to Profile</Button>
      </Link>
    </div>
  );
} 