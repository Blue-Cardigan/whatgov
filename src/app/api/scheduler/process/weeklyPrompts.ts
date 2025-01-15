import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

export const WeeklySummarySchema = z.object({
  summary: z.string(),
  highlights: z.array(z.object({
    title: z.string(),
    type: z.string(),
    summary: z.string(),
    date: z.string()
  }))
});

export const weeklySummaryFormat = zodResponseFormat(WeeklySummarySchema, "weekly_summary");

export function getWeeklySummaryPrompt() {
  return `As an expert in UK Parliament and pithy newspaper style summaries, provide a concise and detailed summary of this week's parliamentary activities so far. Focus on the most impactful and newsworthy items, with a focus on outcomes, specific Ministers, and key bills.

Requirements:
1. Provide a pithy overview of the week's key events so far (max 2 sentences)
2. List up to 5 highlights, with each item getting no more than 2 sentences
3. Focus on outcomes and significant developments
4. Include specific dates for each highlight
5. For each highlight, cite the relevant debate or event IDs

Provide:
- A summary containing the overview paragraph
- Highlights, consisting of:
  * title: The main topic or bill name
  * type: The type of parliamentary activity (e.g., "PMQs", "Debate", "Committee")
  * summary: A 1-2 sentence description of what happened
  * date: The date it occurred (YYYY-MM-DD format)
  * citations: Array of debate or event IDs referenced
`;
}
