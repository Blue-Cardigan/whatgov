import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for our platform',
};

async function getPrivacyContent() {
  const filePath = path.join(process.cwd(), 'src/content/privacy-policy.md');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return marked(fileContent);
}

export default async function PrivacyPage() {
  const content = await getPrivacyContent();

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      <article 
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}