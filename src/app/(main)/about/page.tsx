import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { Card } from "@/components/ui/card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'About WhatGov | Making Parliament Accessible',
  description: 'Learn about WhatGov\'s mission to make parliamentary democracy more accessible, understandable, and engaging for everyone in the UK.',
};

async function getAboutContent() {
  const filePath = path.join(process.cwd(), 'src/content/about-page.md');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return marked(fileContent);
}

export default async function AboutPage() {
  const content = await getAboutContent();

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <Card className="p-6 sm:p-8">
        <article 
          className="prose prose-sm sm:prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </Card>
    </div>
  );
} 