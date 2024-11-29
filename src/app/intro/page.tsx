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
            Follow Parliament directly, not just the headlines
          </h2>
          <p className="text-lg text-muted-foreground">
            Get beyond media interpretations with direct access to Parliament. WhatGov helps you 
            understand parliamentary debates in plain language, track issues you care about, and 
            see how decisions really affect your community.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<FileText className="w-6 h-6" />}
            title="Straight from Source"
            description="Access parliamentary debates directly, simplified into everyday language."
          />
          <FeatureCard
            icon={<UserCircle className="w-6 h-6" />}
            title="Personal Impact"
            description="See how parliamentary decisions affect you and people like you."
          />
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Direct Updates"
            description="Get notified about topics you care about, as they happen in Parliament."
          />
        </div>

        {/* Trust Badge */}
        <div className="text-center bg-secondary/30 rounded-lg p-6">
          <p className="text-sm text-muted-foreground italic">
            &ldquo;Democracy works best with direct access to information. Skip the media filter 
            and engage with Parliament on your terms.&rdquo;
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
            parliamentary proceedings accessible. We respect your privacy and only use your 
            preferences to provide relevant insights. All information is derived from official 
            parliamentary records and should be cross-referenced with Hansard for verbatim quotes.
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