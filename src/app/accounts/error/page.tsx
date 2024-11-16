import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="container max-w-lg mx-auto p-8">
        <div className="bg-background rounded-xl shadow-lg p-8 text-center">
          <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">
            Verification Failed
          </h1>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t verify your email. The link may have expired or is invalid.
          </p>
          <div className="space-y-4">
            <Link href="/accounts/signup">
              <Button className="w-full">Try signing up again</Button>
            </Link>
            <Link href="/support">
              <Button variant="outline" className="w-full">Contact Support</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 