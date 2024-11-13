"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const router = useRouter();

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="container max-w-lg mx-auto p-8">
        <motion.div 
          className="bg-background rounded-xl shadow-lg p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </motion.div>

          <h1 className="text-3xl font-semibold mb-3">
            Account Created Successfully!
          </h1>
          
          <p className="text-muted-foreground mb-8">
            Your account has been created and you&apos;re ready to start voting on issues.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            You&apos;ll be automatically redirected to the home page in a few seconds.
          </p>

          <div className="space-y-4">
            <Button 
              onClick={() => router.push("/")}
              className="w-full py-6 text-lg"
            >
              Go to Home Page
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 