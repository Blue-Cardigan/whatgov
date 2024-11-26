import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for our platform',
};

async function getTermsContent() {
  const filePath = path.join(process.cwd(), 'src/content/terms-of-service.md');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return marked(fileContent);
}

export default async function TermsPage() {
  const content = await getTermsContent();

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      <article 
        className="prose prose-slate dark:prose-dark max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
} 