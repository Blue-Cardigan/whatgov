"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Target,
  Calendar,
  Vote,
  Bell,
  BarChart2,
  Search,
  Users,
  Database,
  CheckCircle2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Feature {
  icon: React.ReactNode;
  title: string;
  items: string[];
}

interface PlanProps {
  name: string;
  price: string;
  description: string;
  features: Feature[];
  cta: {
    text: string;
    href: string;
  };
}

const plans = [
  {
    name: "Core Features",
    price: "Free",
    description: "For all citizens - because democracy should be accessible",
    features: [
      { icon: <Target />, title: "Follow What Matters", items: [
        "Track key parliamentary debates in real time",
        "Get clear, jargon-free summaries",
        "See what's happening in your constituency",
        "View basic MP profiles and voting records"
      ]},
      { icon: <Calendar />, title: "Stay Updated", items: [
        "Daily digest of parliamentary activity",
        "Parliamentary calendar and upcoming debates",
        "Basic debate search and filtering",
        "Follow up to 3 key topics"
      ]},
      { icon: <Vote />, title: "Engage", items: [
        "Compare your views with parliamentary votes",
        "See basic voting records",
        "View debate transcripts",
        "Access essential parliamentary information"
      ]}
    ],
    cta: { text: "Start Free", href: "/accounts/signup" }
  },
  {
    name: "Engaged Citizen",
    price: "£4.99/month",
    description: "For engaged citizens who want deeper insights",
    features: [
      { icon: <Bell />, title: "Enhanced Tracking", items: [
        "Follow unlimited topics",
        "Get instant alerts for issues you care about",
        "Save debates for later reading",
        "Personalized feed based on your interests"
      ]},
      { icon: <BarChart2 />, title: "Better Understanding", items: [
        "Full AI-simplified debate versions",
        "Detailed MP activity tracking",
        "Advanced voting analytics",
        "Custom topic alerts and notifications"
      ]},
      { icon: <Search />, title: "Deeper Access", items: [
        "Advanced search capabilities",
        "Personal debate notes and highlights",
        "Ad-free experience",
        "Premium debate insights"
      ]}
    ],
    cta: { text: "Start Engaged Citizen Trial", href: "/pricing" }
  },
  {
    name: "Professional",
    price: "£15.99/month",
    description: "Advanced research and analysis tools for policy professionals",
    features: [
      { icon: <Database />, title: "Research Power", items: [
        "Everything in Engaged Citizen, plus:",
        "AI research assistant",
        "Cross-debate analysis",
        "Advanced Hansard search",
        "Historical data access"
      ]},
      { icon: <Search />, title: "Smart Tools", items: [
        "Search alerts and subscriptions",
        "Data export in multiple formats",
        "Citation tools",
        "Batch processing"
      ]},
      { icon: <BarChart2 />, title: "Integration", items: [
        "Basic API access",
        "Research collaboration tools",
        "Advanced data filtering",
        "Custom data views"
      ]}
    ],
    cta: { text: "Start Professional Trial", href: "/pricing" }
  },
  {
    name: "Enterprise",
    price: "Custom pricing",
    description: "Custom solutions for organizations and teams",
    features: [
      { icon: <Users />, title: "Team Features", items: [
        "Everything in Professional, plus:",
        "Multi-user accounts",
        "Team collaboration workspace",
        "Shared research and notes",
        "Usage analytics"
      ]},
      { icon: <BarChart2 />, title: "Analysis Tools", items: [
        "Custom report generation",
        "Constituency analysis",
        "Presentation tools",
        "Bulk data export"
      ]},
      { icon: <Database />, title: "Enterprise Support", items: [
        "Advanced API access",
        "Priority support",
        "Custom training",
        "Service level agreement"
      ]}
    ],
    cta: { text: "Contact Enterprise Sales", href: "mailto:enterprise@whatgov.co.uk" }
  }
];

export default function FeaturesPage() {
  return (
    <div className="container max-w-6xl mx-auto py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-16"
      >
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold">See Parliament Your Way</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            WhatGov gives you the tools to understand Parliament&apos;s work in a way that 
            makes sense for you. Choose the access level that fits your needs.
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard key={plan.name} {...plan} />
          ))}
        </div>

        {/* Comparison Table */}
        <ComparisonTable />

        {/* FAQs */}
        <FAQSection />

        {/* Contact Section */}
        <div className="text-center space-y-6 bg-secondary/20 rounded-lg p-8">
          <h2 className="text-2xl font-bold">Still Have Questions?</h2>
          <p className="text-muted-foreground">
            Our team is here to help you find the right plan for your needs.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline">Contact Support</Button>
            <Button>Book a Demo</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PlanCard({ name, price, description, features, cta }: PlanProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="border rounded-lg p-6 space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold">{name}</h2>
        <p className="text-xl font-semibold">{price}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-6">
        {features.map((feature: Feature) => (
          <div key={feature.title} className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              {feature.icon}
              <h3 className="font-semibold">{feature.title}</h3>
            </div>
            <ul className="space-y-1">
              {feature.items.map((item: string) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-1 text-primary" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="pt-6">
        <Link href={cta.href}>
          <Button className="w-full">{cta.text}</Button>
        </Link>
      </div>
    </motion.div>
  );
}

function ComparisonTable() {
  const features = [
    { name: "Daily Digest", citizen: true, engaged: true, professional: true, enterprise: true },
    { name: "Topic Following", citizen: "3 topics", engaged: "Unlimited", professional: "Unlimited", enterprise: "Unlimited" },
    { name: "Debate Summaries", citizen: "Basic", engaged: "Full", professional: "Full + Analysis", enterprise: "Custom" },
    { name: "MP Tracking", citizen: "Basic", engaged: "Detailed", professional: "Advanced", enterprise: "Custom" },
    { name: "Search Capabilities", citizen: "Basic", engaged: "Advanced", professional: "Full", enterprise: "Enterprise" },
    { name: "Alerts & Notifications", citizen: false, engaged: true, professional: true, enterprise: true },
    { name: "Data Export", citizen: false, engaged: "Basic", professional: "Advanced", enterprise: "Custom" },
    { name: "API Access", citizen: false, engaged: false, professional: "Limited", enterprise: "Full" },
    { name: "Team Features", citizen: false, engaged: false, professional: false, enterprise: true },
    { name: "Support", citizen: "Community", engaged: "Email", professional: "Priority", enterprise: "Dedicated" },
  ];

  const renderCheck = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Compare Plans</h2>
        <p className="text-muted-foreground">
          Find the perfect plan for your needs
        </p>
      </div>
      
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Feature</TableHead>
              <TableHead className="text-center">Citizen</TableHead>
              <TableHead className="text-center">Engaged Citizen</TableHead>
              <TableHead className="text-center">Professional</TableHead>
              <TableHead className="text-center">Enterprise</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={feature.name}>
                <TableCell className="font-medium">{feature.name}</TableCell>
                <TableCell className="text-center">{renderCheck(feature.citizen)}</TableCell>
                <TableCell className="text-center">{renderCheck(feature.engaged)}</TableCell>
                <TableCell className="text-center">{renderCheck(feature.professional)}</TableCell>
                <TableCell className="text-center">{renderCheck(feature.enterprise)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "Can I switch plans at any time?",
      answer: "Yes, you can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at your next billing cycle."
    },
    {
      question: "Do you offer educational discounts?",
      answer: "Yes! Students and educational institutions can receive special pricing. Contact our support team to learn more about our educational programs."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards and debit cards. Enterprise customers can arrange alternative payment methods including invoicing."
    },
    {
      question: "Is my data secure?",
      answer: "Yes. We use industry-standard encryption and never share your personal data. All our systems are regularly audited and comply with relevant data protection regulations."
    },
    {
      question: "Can I try before I subscribe?",
      answer: "Yes! Our Citizen tier is completely free and gives you access to essential features. You can upgrade to a paid plan whenever you're ready."
    },
    {
      question: "What happens if I cancel my subscription?",
      answer: "If you cancel, you'll continue to have access to your current plan until the end of your billing period. After that, your account will revert to the free Citizen tier."
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
        <p className="text-muted-foreground">
          Have a different question? Contact our support team
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-left">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}