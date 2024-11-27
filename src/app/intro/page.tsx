"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, FileText, UserCircle, MessageSquare } from "lucide-react";
import { SimpleFooter } from '@/components/layout/SimpleFooter';

export default function IntroPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-3xl mx-auto py-16 px-4 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold">Welcome to WhatGov</h1>
          </div>

          {/* Main Value Proposition */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">
              What happens in Parliament matters. We make it easy to understand.
            </h2>
            <p className="text-lg text-muted-foreground">
              WhatGov transforms complex parliamentary debates and proceedings into clear, 
              accessible information. Track issues you care about, understand your MP&apos;s work, 
              and see how Parliament&apos;s decisions affect your community.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Clear Summaries"
              description="Every parliamentary debate simplified into everyday language."
            />
            <FeatureCard
              icon={<UserCircle className="w-6 h-6" />}
              title="Easy Monitoring"
              description="Track what MPs say and vote on in Parliament."
            />
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Stay Informed"
              description="Follow topics and subscribe to searches."
            />
          </div>

          {/* Trust Badge */}
          <div className="text-center bg-secondary/30 rounded-lg p-6">
            <p className="text-sm text-muted-foreground italic">
              &ldquo;Democracy is built on understanding. WhatGov helps build that understanding, 
              one debate at a time.&rdquo;
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Footer Note */}
          <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto">
            <span className="text-xs block mt-2">
            WhatGov uses official Parliamentary data from Hansard and AI technology to make 
            parliamentary proceedings accessible. While we use AI to help summarise content, 
            all information is derived from official parliamentary records and should be 
            cross-referenced with Hansard for verbatim quotes.
            </span>
          </p>
        </motion.div>
      </div>
      <SimpleFooter />
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode;
  title: string; 
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm"
    >
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}