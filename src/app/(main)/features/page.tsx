"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Target,
  Clock,
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
import { SimpleFooter } from '@/components/layout/SimpleFooter';

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
        "Browse parliament, made accessible by us",
        "Save and export your search results",
          "Advanced Hansard search",
          "Try the AI research assistant with Hansard-wide analysis capabilities",
      ]}
    ],
    cta: { text: "Start Free", href: "/signup" }
  },
  {
    name: "Professional",
    price: "£12.99/month",
    description: "Advanced research and analysis tools for policy professionals",
    features: [
      { icon: <Search />, title: "Research Power", items: [
        "Everything in Free, plus:",
        "Unlimited AI briefings on any topic",
        "Subscribe to upcoming events and searches to never miss out",
        "Add your own RSS feeds",
      ]}
    ],
    cta: { text: "Coming Soon", href: "#" }
  },
  {
    name: "Enterprise",
    price: "Custom pricing",
    description: "Custom solutions for organisations and teams",
    features: [
      { icon: <Users />, title: "Team Features", items: [
        "Everything in Professional, plus:",
        "User Management",
        "Collaboration workspaces",
        "Fine control over prompts and schedules",
      ]},
      { icon: <Database />, title: "Enterprise Support", items: [
        "Bulk data export",
        "Priority support",
      ]}
    ],
    cta: { text: "Contact Us", href: "mailto:enterprise@whatgov.co.uk" }
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
            Understand Parliament&apos;s work quickly and easily. 
            Choose the access level that fits your needs.
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
            <Button asChild>
              <Link href="mailto:hi@whatgov.co.uk">Contact Us</Link>
            </Button>
          </div>
        </div>
      </motion.div>
      <SimpleFooter />
    </div>
  );
}

function PlanCard({ name, price, description, features, cta, comingSoon }: PlanProps & { comingSoon?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: comingSoon ? 0 : -5 }}
      className={`border rounded-lg p-6 space-y-6 relative ${comingSoon ? 'opacity-75' : ''}`}
    >
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold">{name}</h2>
          {comingSoon && (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
              <Clock className="w-3 h-3 mr-1" />
              Coming Soon
            </Badge>
          )}
        </div>
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
        <Button 
          className="w-full" 
          variant={comingSoon ? "secondary" : "default"}
          disabled={comingSoon}
          asChild={!comingSoon}
        >
          {comingSoon ? (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {cta.text}
            </span>
          ) : (
            <Link href={`/pricing?plan=${encodeURIComponent(name.toLowerCase())}`}>
              {cta.text}
            </Link>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function ComparisonTable() {
  const features = [
    { name: "Daily Digest", citizen: true, professional: true, enterprise: true },
    { name: "Debate Summaries", citizen: "Fun", professional: true, enterprise: "Custom" },
    { name: "MP Tracking", citizen: "Coming soon", professional: "Coming soon", enterprise: "Custom" },
    { name: "Search Capabilities", citizen: "Basic", professional: true, enterprise: "Enterprise" },
    { name: "Alerts & Notifications", citizen: false, professional: true, enterprise: true },
    { name: "Data Export", citizen: false, professional: true, enterprise: "Custom" },
    { name: "API Access", citizen: false, professional: false, enterprise: "Full" },
    { name: "Team Features", citizen: false, professional: false, enterprise: true },
    { name: "Support", citizen: "Community", professional: false, enterprise: "Dedicated" },
  ];

  const renderCheck = (value: boolean | string) => {
    if (value === "Coming Soon") {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
          Coming Soon
        </Badge>
      );
    }
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
              <TableHead className="text-center">Professional</TableHead>
              <TableHead className="text-center">Enterprise</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={feature.name}>
                <TableCell className="font-medium">{feature.name}</TableCell>
                <TableCell className="text-center">{renderCheck(feature.citizen)}</TableCell>
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